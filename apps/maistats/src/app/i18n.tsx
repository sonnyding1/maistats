import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type SupportedLanguage = 'zh' | 'en';
export type LanguagePreference = 'system' | SupportedLanguage;

export const LANGUAGE_STORAGE_KEY = 'maistats.language';

const LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  zh: 'zh-CN',
  en: 'en-US',
};

function defineTranslations<T extends Record<string, string>>(value: {
  zh: T;
  en: { [K in keyof T]: string };
}) {
  return value;
}

const translations = defineTranslations({
  zh: {
    'nav.home': 'Home',
    'nav.setup': 'Setup',
    'nav.scores': 'Scores',
    'nav.rating': 'Rating',
    'nav.tiers': 'User Tier',
    'nav.playlogs': 'Playlogs',
    'nav.plot': 'Plot',
    'nav.settings': 'Settings',
    'nav.primary': 'Primary',
    'nav.openPages': '打开页面列表',
    'common.filters': 'Filters',
    'common.chartTraits': '谱面特性',
    'common.recordTraits': '记录特性',
    'common.close': '关闭',
    'common.connect': '连接',
    'common.connecting': '连接中...',
    'common.all': 'ALL',
    'common.apply': '应用',
    'common.search': '搜索',
    'common.loadingCharts': '正在加载谱面...',
    'common.loadingPlaylogs': '正在加载游玩记录...',
    'common.loadingVersions': '正在加载版本...',
    'common.jacket': 'Jacket',
    'common.title': 'Title',
    'common.chart': 'Chart',
    'common.levelShort': 'Lv',
    'common.achievementShort': 'Achv',
    'common.rating': 'Rating',
    'common.rank': 'Rank',
    'common.fc': 'FC',
    'common.sync': 'Sync',
    'common.dx': 'DX',
    'common.lastPlayed': 'Last Played',
    'common.playCount': 'Play Count',
    'common.version': 'Version',
    'common.track': 'Track',
    'common.type': 'Type',
    'common.diff': 'Diff',
    'common.achievement': 'Achievement',
    'common.error': '错误',
    'common.min': 'MIN',
    'common.max': 'MAX',
    'common.from': 'FROM',
    'common.to': 'TO',
    'common.none': '无',
    'common.ready': 'Ready',
    'units.songs': '{{count}} 首',
    'units.credits': '{{count}} 局',
    'units.daysAgo': '{{count}} 天前',
    'player.connected': 'Connected player',
    'player.totalPlayCount': 'Total play count',
    'player.refresh': '刷新最新记录',
    'player.refreshing': '正在获取最新记录...',
    'home.connect.title': '连接个人记录收集服务器',
    'home.connect.description': '输入个人记录收集服务器的 URL 并检查连接。',
    'home.connect.serverUrl': '服务器 URL',
    'home.connect.placeholder': 'https://your-server.example.com',
    'home.connect.failed': '连接失败：{{message}}',
    'home.connect.success': '连接成功！玩家：{{name}}',
    'home.connect.goToScores': '前往 Scores →',
    'home.quickStart.title': '不是第一次访问吗？',
    'home.quickStart.submit': '登录',
    'home.welcome.title': 'Welcome to maistats!',
    'home.intro.description': 'maistats 帮助你利用个人服务器追踪自己的 maimai 游玩记录，生成统计数据并加以管理。',
    'home.intro.helper': '前提是你自己运行个人记录收集服务器。如果是第一次使用，建议先阅读设置指南。',
    'home.menu.title': 'Quickstart',
    'home.startCard.title': '设置个人记录收集服务器',
    'home.supportCard.title': '加入支持服务器',
    'home.openSetup': '查看设置指南',
    'home.guide.title': '个人记录收集服务器设置指南',
    'home.guide.prerequisiteTitle': '准备工作',
    'home.guide.prerequisiteBody': '一台常开且可以运行 Docker 的电脑',
    'home.guide.step1Title': '创建 compose.yaml 文件',
    'home.guide.step1BodyA': '在用于运行服务器的文件夹中，用以下内容创建 ',
    'home.guide.step1BodyB': ' 文件。',
    'home.guide.step1BodyC': '和',
    'home.guide.step1BodyD': ' 中填入 maimai DX NET 账号信息。',
    'home.guide.step1Port': '此设置会把容器的 3000 端口映射到本机端口。默认是 3000 端口，可通过 MAISTATS_HOST_PORT 环境变量修改。',
    'home.guide.step2Title': '运行 Docker Compose',
    'home.guide.step2BodyA': '在已安装 Docker 的环境中，',
    'home.guide.step2BodyB': ' 所在文件夹里用下面的命令启动容器。',
    'home.guide.step2BodyC': '首次运行时，登录 maimai DX NET 后会开始收集初始数据。由于需要获取 maimai DX 收录的全部曲目记录，可能需要几分钟到几十分钟。',
    'home.guide.step3Title': '外部访问设置（可选）',
    'home.guide.step3Body': '如需从外部访问，请把这台电脑的个人记录收集服务器端口通过公网 IP 或域名暴露出去。默认端口为 3000，如果修改过 MAISTATS_HOST_PORT，则暴露对应端口即可。可以使用 ngrok、Cloudflare Tunnel 等工具。',
    'home.guide.step4Title': '连接 URL',
    'home.guide.step4BodyA': '服务器准备好后，在下面的输入框中填入服务器 URL 并点击 ',
    'home.guide.step4BodyB': ' 按钮。连接成功后会自动跳转到 Scores 页面。',
    'home.footer.aliases': '部分曲名别名来自 ',
    'home.footer.aliasesTail': '，并已获得许可。',
    'home.footer.parsing': '曲目解析参考了 ',
    'home.footer.parsingTail': '。',
    'home.footer.source': 'maistats 的源代码发布在 ',
    'home.footer.sourceTail': '。',
    'home.footer.developer': '开发者：',
    'home.footer.copyrightA': '本站是为个人成绩记录与追踪而制作的 ',
    'home.footer.copyrightB': ' 粉丝网站，站内使用的游戏相关内容版权归 ',
    'home.footer.copyrightC': ' 及 ',
    'home.footer.copyrightOwners': '各自的所有者',
    'home.footer.copyrightD': ' 所有。',
    'settings.title': 'Connections',
    'settings.description': '管理 Song Database 与个人记录收集服务器的连接信息。',
    'settings.recordCollectorUrl': '个人记录收集服务器 URL',
    'settings.songInfoWarning': '⚠ 除非用于调试，否则请勿修改。',
    'settings.language.title': 'Language',
    'settings.language.description': '将应用语言设为跟随设备语言或手动选择。',
    'settings.language.label': 'App language',
    'settings.language.helperSystem': '当前跟随设备语言。正在使用的语言：{{language}}',
    'settings.language.helperManual': '正在使用的语言：{{language}}',
    'settings.language.optionSystem': 'System default',
    'settings.language.optionZh': '简体中文',
    'settings.language.optionEn': 'English',
    'settings.theme.title': 'Theme',
    'settings.theme.description': '选择应用的配色主题。',
    'settings.theme.label': 'Color theme',
    'settings.theme.optionSystem': 'System default',
    'settings.theme.optionLight': 'Light',
    'settings.theme.optionDark': 'Dark',
    'settings.recordCollector.success': '连接成功！玩家：{{name}}',
    'settings.recordCollector.failed': '连接失败：{{message}}',
    'settings.logs.title': 'Collector Logs',
    'settings.logs.description': '查看个人记录收集服务器通过 tracing 输出的最近日志。',
    'settings.logs.refresh': '刷新日志',
    'settings.logs.refreshing': '正在加载日志...',
    'settings.logs.save': '保存为文件',
    'settings.logs.emptyUrl': '请先连接个人记录收集服务器，然后即可加载日志。',
    'settings.logs.empty': '暂无可显示的日志。',
    'settings.logs.failed': '无法加载日志：{{message}}',
    'settings.logs.count': '正在显示最近 {{shown}} 行',
    'scores.resetAll': '全部重置',
    'scores.searchLabel': '搜索（曲名/别名/版本/等级）',
    'scores.searchPlaceholder': '例：VERTeX、PRiSM、14+',
    'scores.chartType': '谱面类型',
    'scores.difficulty': '难度',
    'scores.level': '等级',
    'scores.levelMin': '等级下限',
    'scores.levelMax': '等级上限',
    'scores.playedOnly': '只显示有游玩记录的曲目',
    'scores.score': '分数',
    'scores.achievementMin': '达成率下限',
    'scores.achievementMax': '达成率上限',
    'scores.version': '版本',
    'scores.daysSince': '间隔天数',
    'scores.daysMin': '间隔天数下限',
    'scores.daysMax': '间隔天数上限',
    'scores.chartsTitle': 'Charts',
    'scores.chartsDescription': '同时查看分数数据与谱面元数据。灰色小数表示推算的定数。',
    'scores.noCollectorNotice': '未设置个人记录收集服务器 URL，因此不显示个人记录，只能查看 Song Database 中的曲目/谱面信息。',
    'scores.versionAll': 'ALL',
    'scores.versionNew': 'NEW',
    'scores.versionOld': 'OLD',
    'playlogs.searchLabel': '搜索（曲名/别名/时间）',
    'playlogs.searchPlaceholder': '例：2026/02/25、BUDDiES',
    'playlogs.showAll': '查看全部游玩记录',
    'playlogs.dayLabel': '游玩日期（以 maimai day 04:00 为准）',
    'playlogs.summaryAll': '全部：{{songCount}} 首',
    'playlogs.summaryDay': '{{songCount}} 首 · {{creditCount}} 局',
    'playlogs.bestOnly': '只显示每首曲目/谱面的最佳记录',
    'playlogs.newRecordOnly': '只显示 new record',
    'playlogs.creditNumber': 'Credit #',
    'playlogs.playedAt': 'Played At',
    'playlogs.dayOption': '{{date}} ({{credits}} credits)',
    'rating.title': 'RATING',
    'rating.description': 'NEW 前 15 首与 OLD 前 35 首的 Rating 合计。对于定数未知的曲目，计算结果可能不准确。',
    'rating.current': 'Current Rating',
    'rating.newTop15': 'NEW TOP 15',
    'rating.oldTop35': 'OLD TOP 35',
    'rating.avg': 'AVG {{value}}',
    'rating.avgProjection': 'AVG {{avg}}, ~{{projection}}',
    'rating.newDescription': 'NEW 分类前 15 首。点击卡片可打开 Song Detail。',
    'rating.oldDescription': 'OLD 分类前 35 首。点击卡片可打开 Song Detail。',
    'rating.version': '版本',
    'rating.playCountVersion': '当前版本游玩次数',
    'rating.playCountTotal': '累计游玩次数',
    'rating.date': '日期',
    'rating.exportPanelTitle': 'B50 图片',
    'rating.exportSave': '保存 PNG',
    'rating.exportCopy': '复制到剪贴板',
    'rating.exportWorking': '生成中…',
    'rating.exportSaved': '已保存',
    'rating.exportCopied': '已复制',
    'rating.exportFailed': '导出图片失败',
    'rating.exportClipboardFailed': '浏览器阻止了剪贴板访问。请改用「保存 PNG」。',
    'rating.openSongDetail': '打开 {{title}} 的 Song Detail',
    'tiers.filters': '筛选',
    'tiers.displayMode': '显示方式',
    'tiers.displayMode.normalized': 'Normalized tier',
    'tiers.displayMode.raveille': 'Raveille 原始',
    'tiers.info.beforeLink': '本页的 tier 信息来自 ',
    'tiers.info.linkLabel': 'Raveille 的 tier 表',
    'tiers.info.afterLink': '。normalized tier 是基于该 tier 表、由 Lomo 制作的映射，在 maistats 中整理并调整到 13.00 - 14.50 范围后的数值。',
    'tiers.hideNoData': '隐藏无游玩记录的曲目',
    'tiers.hideBelow90': '隐藏低于 90% 的记录',
    'tiers.empty': '未找到 User tier 数据。请确认 Song Database 是否提供 raveille_user_tier.json。',
    'tiers.emptyAfterFilter': '当前筛选条件下没有可显示的记录。',
    'tiers.unknownInternalLevel': '无 Internal level',
    'tiers.unknownRaveilleInternalLevel': '无 Raveille level',
    'tiers.unknownRaveilleTier': '无 Raveille tier',
    'tiers.averageScore': 'AVG',
    'tiers.playedCountLabel': 'PLAYED',
    'tiers.playedCountValue': '{{played}} / {{total}}',
    'plot.title': 'Score Distribution',
    'plot.description': '按官方等级与达成率展示指定期间内游玩过（达成率 90% 以上）的曲目。',
    'plot.daysWindow': '期间',
    'plot.daysValue': '{{count}} 天',
    'plot.daysMax': 'max',
    'plot.displayMode': '显示',
    'plot.displayMode.scatter': 'Scatter',
    'plot.displayMode.box': 'Box',
    'plot.empty': '没有符合条件的曲目。',
    'plot.userTierTitle': 'User Tier Distribution',
    'plot.userTierDescription': '按 user tier 与达成率展示同一期间内游玩过的 90% 以上记录。',
    'plot.userTierEmpty': '没有可显示的 tier 记录。',
    'songDetail.title': 'Song Detail',
    'songDetail.refreshing': '更新中...',
    'songDetail.refresh': '刷新 Score',
    'songDetail.refreshUnavailable': '曲目识别信息不足，无法刷新。',
    'songDetail.empty': '没有可查询的详细数据。',
    'history.title': 'History',
    'history.description': '仅显示 playlogs 中最高达成率被刷新的时刻。',
    'history.loading': '正在加载 playlogs。',
    'history.empty': '在 playlogs 中未找到该谱面的最佳记录变化历史。',
    'history.graphLabel': '{{title}} 最高达成率变化图',
    'history.axisAchievement': 'Achievement',
    'history.axisTime': 'Time',
    'history.openChartHistory': '打开 {{title}} 谱面的 History',
    'app.missingUrls': '需要 Song Database URL。',
    'api.enterUrl': '请输入 URL。',
    'api.connectionFailed': '收到 HTTP {{status}} 响应。',
    'api.recordCollectorRequired': '个人记录收集服务器 URL 为空。',
    'recordCollector.version.outdated': '个人记录收集服务器需要更新。应用版本为 {{currentVersion}}，服务器版本为 {{collectorVersion}}。',
    'recordCollector.version.invalid': '个人记录收集服务器返回了无效的 semantic version（{{collectorVersion}}）。请更新服务器。',
    'recordCollector.version.unreachable': '无法确认个人记录收集服务器的 `/api/version`。请将服务器更新到 {{currentVersion}} 或更高版本。',
  },
  en: {
    'nav.home': 'Home',
    'nav.setup': 'Setup',
    'nav.scores': 'Scores',
    'nav.rating': 'Rating',
    'nav.tiers': 'User Tier',
    'nav.playlogs': 'Playlogs',
    'nav.plot': 'Plot',
    'nav.settings': 'Settings',
    'nav.primary': 'Primary',
    'nav.openPages': 'Open page list',
    'common.filters': 'Filters',
    'common.chartTraits': 'Chart traits',
    'common.recordTraits': 'Record traits',
    'common.close': 'Close',
    'common.connect': 'Connect',
    'common.connecting': 'Connecting...',
    'common.all': 'ALL',
    'common.apply': 'Apply',
    'common.search': 'Search',
    'common.loadingCharts': 'Loading charts...',
    'common.loadingPlaylogs': 'Loading playlogs...',
    'common.loadingVersions': 'Loading versions...',
    'common.jacket': 'Jacket',
    'common.title': 'Title',
    'common.chart': 'Chart',
    'common.levelShort': 'Lv',
    'common.achievementShort': 'Achv',
    'common.rating': 'Rating',
    'common.rank': 'Rank',
    'common.fc': 'FC',
    'common.sync': 'Sync',
    'common.dx': 'DX',
    'common.lastPlayed': 'Last Played',
    'common.playCount': 'Play Count',
    'common.version': 'Version',
    'common.track': 'Track',
    'common.type': 'Type',
    'common.diff': 'Diff',
    'common.achievement': 'Achievement',
    'common.error': 'Error',
    'common.min': 'MIN',
    'common.max': 'MAX',
    'common.from': 'FROM',
    'common.to': 'TO',
    'common.none': 'None',
    'common.ready': 'Ready',
    'units.songs': '{{count}} song(s)',
    'units.credits': '{{count}} credit(s)',
    'units.daysAgo': '{{count}} days ago',
    'player.connected': 'Connected player',
    'player.totalPlayCount': 'Total play count',
    'player.refresh': 'Refresh latest records',
    'player.refreshing': 'Refreshing latest records...',
    'home.connect.title': 'Connect Record Collector',
    'home.connect.description': 'Enter your Record Collector server URL and verify the connection.',
    'home.connect.serverUrl': 'Server URL',
    'home.connect.placeholder': 'https://your-server.example.com',
    'home.connect.failed': 'Connection failed: {{message}}',
    'home.connect.success': 'Connected. Player: {{name}}',
    'home.connect.goToScores': 'Go to Scores →',
    'home.quickStart.title': 'Not your first visit?',
    'home.quickStart.submit': 'Log in',
    'home.welcome.title': 'Welcome to maistats!',
    'home.intro.description': 'maistats helps you use a personal server to track your maimai play records, generate statistics, and manage your progress.',
    'home.intro.helper': 'It assumes you run your own Record Collector. If this is your first visit, start with the setup guide.',
    'home.menu.title': 'Quickstart',
    'home.startCard.title': 'Set up Record Collector',
    'home.supportCard.title': 'Join Support Server',
    'home.openSetup': 'Open setup guide',
    'home.guide.title': 'Personal Record Collection Server Setup Guide',
    'home.guide.prerequisiteTitle': 'Prerequisites',
    'home.guide.prerequisiteBody': 'A computer that stays on and can run Docker.',
    'home.guide.step1Title': 'Create a compose.yaml file',
    'home.guide.step1BodyA': 'Create a ',
    'home.guide.step1BodyB': ' file in the folder where you want to run the server, using the content below. Fill in ',
    'home.guide.step1BodyC': ' and ',
    'home.guide.step1BodyD': ' with your maimai DX NET account credentials.',
    'home.guide.step1Port': 'This maps port 3000 inside the container to a port on your computer. The default host port is 3000, and you can change it with the MAISTATS_HOST_PORT environment variable.',
    'home.guide.step2Title': 'Run Docker Compose',
    'home.guide.step2BodyA': 'On a machine with Docker installed, run the command below in the folder containing ',
    'home.guide.step2BodyB': '.',
    'home.guide.step2BodyC': 'On first launch, the server logs in to maimai DX NET and starts collecting initial data. It needs to fetch records for every song in maimai DX, so this can take several minutes to tens of minutes.',
    'home.guide.step3Title': 'Expose the server (optional)',
    'home.guide.step3Body': 'If you want to connect from outside, expose the personal record collection server port on this computer through a public IP or domain. The default port is 3000; if you changed MAISTATS_HOST_PORT, expose that port instead. Tools like ngrok or Cloudflare Tunnel work well.',
    'home.guide.step4Title': 'Connect the URL',
    'home.guide.step4BodyA': 'Once the server is ready, enter the server URL below and click ',
    'home.guide.step4BodyB': '. On success, the app will move to the Scores page automatically.',
    'home.footer.aliases': 'Song title aliases were imported with permission from ',
    'home.footer.aliasesTail': '.',
    'home.footer.parsing': 'Song parsing was implemented with reference to ',
    'home.footer.parsingTail': '.',
    'home.footer.source': 'The source code for maistats is available at ',
    'home.footer.sourceTail': '.',
    'home.footer.developer': 'Developer:',
    'home.footer.copyrightA': 'This site is a fan-made ',
    'home.footer.copyrightB': ' site built for personal score tracking. Copyright for the in-game content used here belongs to ',
    'home.footer.copyrightC': ' and ',
    'home.footer.copyrightOwners': 'the respective owners',
    'home.footer.copyrightD': '.',
    'settings.title': 'Connections',
    'settings.description': 'Manage the Song Database and Record Collector connection settings.',
    'settings.recordCollectorUrl': 'Record Collector URL',
    'settings.songInfoWarning': 'Do not change this unless you are debugging.',
    'settings.language.title': 'Language',
    'settings.language.description': 'Use your device language by default, or override it for the app.',
    'settings.language.label': 'App language',
    'settings.language.helperSystem': 'Following your device language. Current app language: {{language}}',
    'settings.language.helperManual': 'Current app language: {{language}}',
    'settings.language.optionSystem': 'System default',
    'settings.language.optionZh': 'Simplified Chinese',
    'settings.language.optionEn': 'English',
    'settings.theme.title': 'Theme',
    'settings.theme.description': 'Choose the app color theme.',
    'settings.theme.label': 'Color theme',
    'settings.theme.optionSystem': 'System default',
    'settings.theme.optionLight': 'Light',
    'settings.theme.optionDark': 'Dark',
    'settings.recordCollector.success': 'Connected. Player: {{name}}',
    'settings.recordCollector.failed': 'Connection failed: {{message}}',
    'settings.logs.title': 'Collector Logs',
    'settings.logs.description': 'Review the latest tracing output captured by the record collector.',
    'settings.logs.refresh': 'Refresh logs',
    'settings.logs.refreshing': 'Loading logs...',
    'settings.logs.save': 'Save to file',
    'settings.logs.emptyUrl': 'Connect a Record Collector first to load logs.',
    'settings.logs.empty': 'No log lines are available yet.',
    'settings.logs.failed': 'Failed to load logs: {{message}}',
    'settings.logs.count': 'Showing {{shown}} recent lines',
    'scores.resetAll': 'Reset all',
    'scores.searchLabel': 'Search (title/alias/version/level)',
    'scores.searchPlaceholder': 'Example: VERTeX, Vertex, PRiSM, 14+',
    'scores.chartType': 'Chart Type',
    'scores.difficulty': 'Difficulty',
    'scores.level': 'Level',
    'scores.levelMin': 'Minimum level',
    'scores.levelMax': 'Maximum level',
    'scores.playedOnly': 'Show only songs with play records',
    'scores.score': 'Score',
    'scores.achievementMin': 'Minimum achievement',
    'scores.achievementMax': 'Maximum achievement',
    'scores.version': 'Version',
    'scores.daysSince': 'Days Since',
    'scores.daysMin': 'Minimum days since',
    'scores.daysMax': 'Maximum days since',
    'scores.chartsTitle': 'Charts',
    'scores.chartsDescription': 'Browse score data with chart metadata. Gray decimal digits indicate an estimated internal level.',
    'scores.noCollectorNotice': 'No Record Collector URL is connected, so personal records are treated as empty. Only Song Database chart information is shown.',
    'scores.versionAll': 'ALL',
    'scores.versionNew': 'NEW',
    'scores.versionOld': 'OLD',
    'playlogs.searchLabel': 'Search (title/alias/time)',
    'playlogs.searchPlaceholder': 'Example: 2026/02/25, BUDDiES, Bad Apple',
    'playlogs.showAll': 'Show all playlogs',
    'playlogs.dayLabel': 'Play date (maimai day starts at 04:00)',
    'playlogs.summaryAll': 'All: {{songCount}} song(s)',
    'playlogs.summaryDay': '{{songCount}} song(s) · {{creditCount}} credit(s)',
    'playlogs.bestOnly': 'Show only best record per song/chart',
    'playlogs.newRecordOnly': 'Show only new records',
    'playlogs.creditNumber': 'Credit #',
    'playlogs.playedAt': 'Played At',
    'playlogs.dayOption': '{{date}} ({{credits}} credits)',
    'rating.title': 'RATING',
    'rating.description': 'This is the total of your top 15 NEW songs and top 35 OLD songs. Ratings may be inaccurate for songs without a known internal level.',
    'rating.current': 'Current Rating',
    'rating.newTop15': 'NEW TOP 15',
    'rating.oldTop35': 'OLD TOP 35',
    'rating.avg': 'AVG {{value}}',
    'rating.avgProjection': 'AVG {{avg}}, ~{{projection}}',
    'rating.newDescription': 'Top 15 songs in the NEW category. Click a tile to open Song Detail.',
    'rating.oldDescription': 'Top 35 songs in the OLD category. Click a tile to open Song Detail.',
    'rating.version': 'Version',
    'rating.playCountVersion': 'Plays (this version)',
    'rating.playCountTotal': 'Plays (all time)',
    'rating.date': 'Date',
    'rating.exportPanelTitle': 'B50 image',
    'rating.exportSave': 'Save PNG',
    'rating.exportCopy': 'Copy to clipboard',
    'rating.exportWorking': 'Rendering…',
    'rating.exportSaved': 'Saved',
    'rating.exportCopied': 'Copied',
    'rating.exportFailed': 'Could not export the image',
    'rating.exportClipboardFailed': 'The browser blocked clipboard access. Use Save PNG instead.',
    'rating.openSongDetail': 'Open Song Detail for {{title}}',
    'tiers.filters': 'Filters',
    'tiers.displayMode': 'View by',
    'tiers.displayMode.normalized': 'Normalized tier',
    'tiers.displayMode.raveille': 'Raveille source',
    'tiers.info.beforeLink': 'Tier data on this page comes from ',
    'tiers.info.linkLabel': "Raveille's tier sheet",
    'tiers.info.afterLink': '. The normalized tier is based on Lomo’s mapping from that sheet, organized by maistats into the 13.00 - 14.50 range.',
    'tiers.hideNoData': 'Hide charts without play records',
    'tiers.hideBelow90': 'Hide below 90%',
    'tiers.empty': 'No user tier data is available. Check that the Song Database serves raveille_user_tier.json.',
    'tiers.emptyAfterFilter': 'No records remain with the current filters.',
    'tiers.unknownInternalLevel': 'No internal level',
    'tiers.unknownRaveilleInternalLevel': 'No Raveille level',
    'tiers.unknownRaveilleTier': 'No Raveille tier',
    'tiers.averageScore': 'AVG',
    'tiers.playedCountLabel': 'PLAYED',
    'tiers.playedCountValue': '{{played}} / {{total}}',
    'plot.title': 'Score Distribution',
    'plot.description': 'Shows songs played within the selected period (achievement >= 90%) by official level and achievement.',
    'plot.daysWindow': 'Period',
    'plot.daysValue': '{{count}} days',
    'plot.daysMax': 'max',
    'plot.displayMode': 'View',
    'plot.displayMode.scatter': 'Scatter',
    'plot.displayMode.box': 'Box',
    'plot.empty': 'No songs match the given criteria.',
    'plot.userTierTitle': 'User Tier Distribution',
    'plot.userTierDescription': 'Plots records played within the same period with achievement >= 90% by user tier and achievement.',
    'plot.userTierEmpty': 'No tier records are available.',
    'songDetail.title': 'Song Detail',
    'songDetail.refreshing': 'Refreshing...',
    'songDetail.refresh': 'Refresh Score',
    'songDetail.refreshUnavailable': 'Cannot refresh because the song identifiers are incomplete.',
    'songDetail.empty': 'No detail data is available for this song.',
    'history.title': 'History',
    'history.description': 'Only points where the best achievement improved are shown, based on playlogs.',
    'history.loading': 'Loading playlogs for this chart.',
    'history.empty': 'No history entries for this chart were found in the playlogs.',
    'history.graphLabel': 'Achievement history graph for {{title}}',
    'history.axisAchievement': 'Achievement',
    'history.axisTime': 'Time',
    'history.openChartHistory': 'Open chart history for {{title}}',
    'app.missingUrls': 'Song Database URL is required.',
    'api.enterUrl': 'Please enter a URL.',
    'api.connectionFailed': 'Received HTTP {{status}} from the server.',
    'api.recordCollectorRequired': 'Record Collector URL is empty.',
    'recordCollector.version.outdated': 'Your Record Collector needs an update. The app is on {{currentVersion}}, but the collector reports {{collectorVersion}}.',
    'recordCollector.version.invalid': 'The Record Collector returned an invalid semantic version ({{collectorVersion}}). Please update the server.',
    'recordCollector.version.unreachable': 'The frontend could not verify `/api/version` on the Record Collector. Please update the server to {{currentVersion}} or newer.',
  },
});

export type TranslationKey = keyof typeof translations.zh;
export type TranslationVariables = Record<string, string | number>;

export function interpolate(template: string, variables?: TranslationVariables): string {
  if (!variables) {
    return template;
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
}

export function detectSystemLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter((value): value is string => Boolean(value));

  for (const value of candidates) {
    if (value.toLowerCase().startsWith('zh')) {
      return 'zh';
    }
  }

  return 'en';
}

export function normalizeLanguagePreference(value: string | null): LanguagePreference {
  if (value === 'zh' || value === 'en' || value === 'system') {
    return value;
  }
  return 'system';
}

interface I18nContextValue {
  languagePreference: LanguagePreference;
  setLanguagePreference: (value: LanguagePreference) => void;
  language: SupportedLanguage;
  locale: string;
  t: (key: TranslationKey, variables?: TranslationVariables) => string;
  formatNumber: (value: number) => string;
  compareText: (left: string, right: string) => number;
  formatLanguageName: (value: SupportedLanguage) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>(() => {
    if (typeof localStorage === 'undefined') {
      return 'system';
    }
    return normalizeLanguagePreference(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  });
  const [systemLanguage, setSystemLanguage] = useState<SupportedLanguage>(() => detectSystemLanguage());

  const language = languagePreference === 'system'
    ? systemLanguage
    : languagePreference;
  const locale = LOCALE_BY_LANGUAGE[language];

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, languagePreference);
  }, [languagePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleLanguageChange = () => {
      setSystemLanguage(detectSystemLanguage());
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, variables?: TranslationVariables) => {
      return interpolate(translations[language][key], variables);
    },
    [language],
  );

  const formatNumber = useCallback(
    (value: number) => value.toLocaleString(locale),
    [locale],
  );

  const compareText = useCallback(
    (left: string, right: string) => left.localeCompare(right, locale),
    [locale],
  );

  const formatLanguageName = useCallback(
    (value: SupportedLanguage) => (value === 'zh' ? t('settings.language.optionZh') : t('settings.language.optionEn')),
    [t],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      languagePreference,
      setLanguagePreference: setLanguagePreferenceState,
      language,
      locale,
      t,
      formatNumber,
      compareText,
      formatLanguageName,
    }),
    [compareText, formatLanguageName, formatNumber, language, languagePreference, locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (value === null) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return value;
}
