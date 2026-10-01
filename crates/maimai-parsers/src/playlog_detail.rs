use scraper::{ElementRef, Html, Selector};

use models::{NoteType, ParsedNoteJudgement, ParsedPlaylogDetail};

/// Parses `record/playlogDetail/`.
///
/// Beyond the title and `musicDetail` index, the page carries a per-play
/// judgement breakdown, fast/late counters, max combo (whose denominator is the
/// chart's note count), and the rating after the play. All of those are optional:
/// older or partially rendered pages still parse.
pub fn parse_playlog_detail_html(html: &str) -> eyre::Result<ParsedPlaylogDetail> {
    let document = Html::parse_document(html);

    let title_selectors = [
        "div.basic_block div.f_15.break",
        ".music_name_block",
        ".playlog_music_title",
    ];
    let form_selector = Selector::parse(r#"form[action*="/record/musicDetail/"]"#).unwrap();
    let idx_selector = Selector::parse(r#"input[name="idx"]"#).unwrap();

    let title = title_selectors
        .iter()
        .find_map(|selector| {
            let selector = Selector::parse(selector).ok()?;
            document
                .select(&selector)
                .next()
                .map(|e| e.text().collect::<Vec<_>>().join(""))
                .map(|s| s.trim().to_string())
        })
        .unwrap_or_default();

    let music_detail_idx = document
        .select(&form_selector)
        .find_map(|form| {
            form.select(&idx_selector)
                .next()
                .and_then(|e| e.value().attr("value"))
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .ok_or_else(|| eyre::eyre!("missing MY RECORD musicDetail idx"))?;

    let (fast_count, late_count) = parse_fast_late(&document);
    let (max_combo, note_count) = parse_max_combo(&document);
    let (rating_after, rating_delta) = parse_rating(&document);

    Ok(ParsedPlaylogDetail {
        title,
        music_detail_idx,
        fast_count,
        late_count,
        max_combo,
        note_count,
        rating_after,
        rating_delta,
        judgements: parse_judgements(&document),
    })
}

/// Fast/late counters live in `.playlog_fl_block`, one cell per counter.
fn parse_fast_late(document: &Html) -> (Option<u32>, Option<u32>) {
    let cell_selector = Selector::parse(".playlog_fl_block > div").unwrap();
    let img_selector = Selector::parse("img").unwrap();
    let text_selector = Selector::parse("div").unwrap();

    let mut fast = None;
    let mut late = None;

    for cell in document.select(&cell_selector) {
        let Some(icon) = cell
            .select(&img_selector)
            .next()
            .and_then(|img| img.value().attr("src"))
        else {
            continue;
        };
        let value = cell
            .select(&text_selector)
            .next()
            .and_then(|node| parse_unsigned(&collect_text(&node)));

        match icon_file(icon).as_str() {
            "fast.png" => fast = fast.or(value),
            "late.png" => late = late.or(value),
            _ => {}
        }
    }

    (fast, late)
}

/// Max combo is rendered as `current/total`; the total is the chart note count.
fn parse_max_combo(document: &Html) -> (Option<u32>, Option<u32>) {
    let block_selector = Selector::parse(".playlog_score_block").unwrap();
    let img_selector = Selector::parse("img").unwrap();

    for block in document.select(&block_selector) {
        let is_max_combo = block
            .select(&img_selector)
            .filter_map(|img| img.value().attr("src"))
            .any(|src| icon_file(src) == "maxcombo.png");
        if !is_max_combo {
            continue;
        }
        if let Some((current, total)) = parse_pair(&collect_text(&block)) {
            return (Some(current), Some(total));
        }
    }

    (None, None)
}

/// Rating after the play, plus the signed delta shown as `(+N)` / `(-N)`.
fn parse_rating(document: &Html) -> (Option<u32>, Option<i32>) {
    let rating_selector = Selector::parse(".playlog_rating_detail_block .rating_block").unwrap();
    let rating_after = document
        .select(&rating_selector)
        .next()
        .and_then(|node| parse_unsigned(&collect_text(&node)));

    let block_selector = Selector::parse(".playlog_rating_detail_block").unwrap();
    let rating_delta = document
        .select(&block_selector)
        .next()
        .and_then(|block| parse_signed_parenthesized(&collect_text(&block)));

    (rating_after, rating_delta)
}

/// The judgement table is `table.playlog_notes_detail`: one row per note type,
/// with icon-only column headers, so columns are mapped by position.
fn parse_judgements(document: &Html) -> Vec<ParsedNoteJudgement> {
    let table_selector = Selector::parse("table.playlog_notes_detail").unwrap();
    let row_selector = Selector::parse("tr").unwrap();
    let th_selector = Selector::parse("th").unwrap();
    let td_selector = Selector::parse("td").unwrap();
    let img_selector = Selector::parse("img").unwrap();

    let mut out = Vec::new();
    let Some(table) = document.select(&table_selector).next() else {
        return out;
    };

    for row in table.select(&row_selector) {
        let Some(header) = row.select(&th_selector).next() else {
            continue;
        };
        let Some(note_type) = header
            .select(&img_selector)
            .next()
            .and_then(|img| img.value().attr("src"))
            .and_then(parse_note_type_from_icon)
        else {
            // Header row: icons live in <td>, the <th> is empty.
            continue;
        };

        let counts = row
            .select(&td_selector)
            .map(|cell| parse_unsigned(&collect_text(&cell)).unwrap_or(0))
            .collect::<Vec<_>>();
        if counts.len() < 5 {
            continue;
        }

        out.push(ParsedNoteJudgement {
            note_type,
            critical_perfect: counts[0],
            perfect: counts[1],
            great: counts[2],
            good: counts[3],
            miss: counts[4],
        });
    }

    out
}

fn collect_text(element: &ElementRef<'_>) -> String {
    element.text().collect::<Vec<_>>().join("")
}

/// Basename of an icon URL, without any `?ver=` cache-busting query.
fn icon_file(src: &str) -> String {
    let file = src.rsplit('/').next().unwrap_or(src);
    file.split('?').next().unwrap_or(file).to_string()
}

fn parse_note_type_from_icon(src: &str) -> Option<NoteType> {
    let file = icon_file(src);
    let stem = file.strip_suffix(".png")?;
    stem.parse::<NoteType>().ok()
}

/// Parses a plain unsigned count, tolerating thousands separators.
fn parse_unsigned(text: &str) -> Option<u32> {
    let digits = text
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == ',')
        .collect::<String>()
        .replace(',', "");
    if digits.is_empty() {
        return None;
    }
    digits.parse::<u32>().ok()
}

/// Parses `current/total`.
fn parse_pair(text: &str) -> Option<(u32, u32)> {
    let (left, right) = text.split_once('/')?;
    Some((parse_unsigned(left)?, parse_unsigned(right)?))
}

/// Parses a signed number wrapped in parentheses, e.g. `(+12)` or `(-5)`.
fn parse_signed_parenthesized(text: &str) -> Option<i32> {
    let start = text.find('(')?;
    let end = text[start..].find(')')? + start;
    let inner = text[start + 1..end].trim();

    let (negative, digits) = match inner.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, inner.strip_prefix('+').unwrap_or(inner)),
    };

    let digits = digits
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == ',')
        .collect::<String>()
        .replace(',', "");
    if digits.is_empty() {
        return None;
    }

    let value = digits.parse::<i32>().ok()?;
    Some(if negative { -value } else { value })
}
