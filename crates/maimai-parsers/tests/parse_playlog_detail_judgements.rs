use maimai_parsers::parse_playlog_detail_html;

/// Synthetic markup mirroring the real playlogDetail structure. No personal data.
const HTML: &str = r#"
<html><body>
  <form action="https://maimaidx-eng.com/maimai-mobile/record/musicDetail/" method="get">
    <input type="hidden" name="idx" value="music-detail-idx-1" />
    <button type="submit">MY RECORD</button>
  </form>

  <div class="basic_block"><div class="f_15 break">Example Song</div></div>

  <div class="playlog_fl_block m_5 f_r f_12">
    <div class="w_96 f_l t_r"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/fast.png" /><div class="p_t_5">38</div></div>
    <div class="w_96 f_l t_r"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/late.png" /><div class="p_t_5">21</div></div>
  </div>

  <div class="col2 f_l t_l f_0">
    <div class="playlog_score_block p_5">
      <img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/maxcombo.png" class="h_20" />
      <div class="f_r f_14 white">196/891</div>
    </div>
  </div>

  <div class="playlog_rating_detail_block f_r t_l">
    <div class="p_r p_3 p_l_0 f_l">
      <img src="https://maimaidx-eng.com/maimai-mobile/img/rating_base_silver.png" class="h_30 f_r" />
      <div class="rating_block">13975</div>
    </div>
    <img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/rating_keep.png" class="h_20" />
    <div class="t_r f_0"><span class="f_l f_11 v_t">(+12)</span></div>
  </div>

  <table class="playlog_notes_detail t_r f_l f_11 f_b">
    <tr>
      <th></th>
      <td class="t_c f_0"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/criticalperfect.png" /></td>
      <td class="t_c f_0"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/perfect.png" /></td>
      <td class="t_c f_0"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/great.png" /></td>
      <td class="t_c f_0"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/good.png" /></td>
      <td class="t_c f_0"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/miss.png" /></td>
    </tr>
    <tr>
      <th class="f_0"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/tap.png" /></th>
      <td></td><td>560</td><td>35</td><td>5</td><td>9</td>
    </tr>
    <tr>
      <th class="f_0"><img src="https://maimaidx-eng.com/maimai-mobile/img/playlog/break.png" /></th>
      <td>26</td><td>12</td><td>7</td><td>0</td><td>1</td>
    </tr>
  </table>
</body></html>
"#;

#[test]
fn parses_judgements_and_detail_scalars() -> eyre::Result<()> {
    let parsed = parse_playlog_detail_html(HTML)?;

    assert_eq!(parsed.title, "Example Song");
    assert_eq!(parsed.music_detail_idx, "music-detail-idx-1");

    assert_eq!(parsed.fast_count, Some(38));
    assert_eq!(parsed.late_count, Some(21));

    assert_eq!(parsed.max_combo, Some(196));
    assert_eq!(parsed.note_count, Some(891));

    assert_eq!(parsed.rating_after, Some(13975));
    assert_eq!(parsed.rating_delta, Some(12));

    assert_eq!(parsed.judgements.len(), 2);

    let tap = &parsed.judgements[0];
    assert_eq!(tap.note_type.as_str(), "TAP");
    assert_eq!(tap.critical_perfect, 0);
    assert_eq!(tap.perfect, 560);
    assert_eq!(tap.great, 35);
    assert_eq!(tap.good, 5);
    assert_eq!(tap.miss, 9);

    let break_row = &parsed.judgements[1];
    assert_eq!(break_row.note_type.as_str(), "BREAK");
    assert_eq!(break_row.critical_perfect, 26);
    assert_eq!(break_row.miss, 1);

    // 560+35+5+9 = 609, 26+12+7+0+1 = 46
    assert_eq!(parsed.judged_note_total(), 655);

    Ok(())
}

#[test]
fn missing_detail_sections_still_parse() -> eyre::Result<()> {
    let html = r#"
    <html><body>
      <form action="https://maimaidx-eng.com/maimai-mobile/record/musicDetail/" method="get">
        <input type="hidden" name="idx" value="idx-2" />
      </form>
      <div class="basic_block"><div class="f_15 break">Bare Song</div></div>
    </body></html>
    "#;

    let parsed = parse_playlog_detail_html(html)?;

    assert_eq!(parsed.title, "Bare Song");
    assert_eq!(parsed.fast_count, None);
    assert_eq!(parsed.max_combo, None);
    assert!(parsed.judgements.is_empty());
    assert_eq!(parsed.judged_note_total(), 0);

    Ok(())
}

#[test]
fn negative_rating_delta_parses() -> eyre::Result<()> {
    let html = r#"
    <html><body>
      <form action="https://maimaidx-eng.com/maimai-mobile/record/musicDetail/" method="get">
        <input type="hidden" name="idx" value="idx-3" />
      </form>
      <div class="playlog_rating_detail_block">
        <div class="rating_block">14,120</div>
        <div class="t_r"><span>(-5)</span></div>
      </div>
    </body></html>
    "#;

    let parsed = parse_playlog_detail_html(html)?;

    assert_eq!(parsed.rating_after, Some(14120));
    assert_eq!(parsed.rating_delta, Some(-5));

    Ok(())
}
