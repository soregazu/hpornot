/* ==========================================================
   oh.tyn — 사이트 설정
   콘텐츠/순서/링크는 전부 여기서 바꾸면 됩니다.
   ========================================================== */
window.SITE = {

  /* 섹션 순서. 빼고 싶은 섹션은 목록에서 지우면 숨겨집니다.
     나중에 works를 별도 페이지로 분리할 경우 'works'를 빼고
     moreWorksHref를 'works.html' 등으로 바꾸면 됩니다. */
  sectionOrder: ['hero', 'news', 'about', 'works', 'contact'],
  moreWorksHref: '#works',

  /* 상단 바 sites 팝업 */
  sites: [
    { id: 'spotify',   label: 'Spotify',       href: 'https://open.spotify.com/intl-ja/track/05R9lHjIM7oQ9GCpCrjPfb?si=fe1bd83c421342a0', color: '#1ed760' },
    { id: 'bandcamp',  label: 'Bandcamp',      href: 'https://waveroad.bandcamp.com/', color: '#1da0c3' },
    { id: 'ytmusic',   label: 'YouTube Music', href: 'https://music.youtube.com/watch?v=1Sxm-GQhY6Q&si=HOMPKow2eeU7NhmQ', color: '#ff3b3b' },
    { id: 'instagram', label: 'Instagram',     href: 'https://www.instagram.com/oh.tyn/', color: '#e1306c' },
  ],

  /* 지구본 */
  globe: {
    meridians: 32,                        // 경도선 수 (앞면에는 절반인 16개가 보임)
    parallels: [0, 23.5, -23.5],          // 위도선 (도): 적도(0°), 북회귀선(+23.5°), 남회귀선(-23.5°)
    secondsPerTurn: 60,                   // 한 바퀴 도는 시간(초)
    satInterval: [2000, 3000],            // 인공위성 잔상 생성 주기 범위(ms)
  },

  /* 데모 오디오 트랙 (sonohoka 모드에서 재생) */
  demos: [
    { title: 'demo 260904',            src: 'assets/audios/demo 260904.mp3' },
    { title: 'gosui',                  src: 'assets/audios/gosui.mp3' },
    { title: 'okusuri cover nurserobo', src: 'assets/audios/okusuri cover nurserobo.mp3' },
  ],

  /* News — href에 링크를 넣으면 클릭 시 이동 */
  news: [
    {
      date: '26-09-15',
      title: '[Release] Shimo-Kitazawa Dreaming (...And Unreleased Demos) is now on streaming!',
      href: 'https://open.spotify.com/intl-ja/track/05R9lHjIM7oQ9GCpCrjPfb?si=fe1bd83c421342a0',
    },
    {
      date: '26-08-26',
      title: '[Release] Shimo-Kitazawa Dreaming (...And Unreleased Demos) is OUT NOW!',
      href: 'https://waveroad.bandcamp.com/album/shimo-kitazawa-dreaming-and-unreleased-demos',
    },
  ],

  /* 자기소개 (문단 배열) */
  about: {
    en: [
      'Born in 2007, from Sintanjin. Currently based in Seoul.<br>Attending the Department of Geography at Kyung Hee University.',
      'Works on photography, video, and design.',
      'Active as oh.tyn in visual arts and waveroad in band music, having released one album under waveroad. Preparing for Vocaloid producer activities, currently producing a new album.',
    ],
    jp: [
      '2007年生まれ、新灘津（シンタンジン）出身。現在ソウル在住。<br>慶熙大学校地理学科在学。',
      '写真撮影歴10年をベースに、リミナルな感性を込めた写真・映像制作およびデザインを手がける。ビジュアル領域では「oh.tyn」、バンド音楽では「waveroad」名義で活動中であり、waveroad名義でアルバムを1枚リリースしている。',
      'ボカロPとしての活動を準備中で、現在は新しいアルバムを制作中。',
    ],
    kr: [
      '2007년생, 신탄진 출신. 현재 서울 거주.<br>경희대학교 지리학과 재학 중.',
      '10년간의 사진 경력을 바탕으로, 리미널한 감성을 담은 사진·영상 작업과 디자인을 한다. 비주얼 작업은 「oh.tyn」, 밴드 음악은 「waveroad」라는 이름으로 활동하며, waveroad로 앨범 1장을 발매했다.',
      '보카로P 활동을 준비 중이며, 현재 새 앨범을 작업하고 있다.',
    ],
  },

  /* Works — assets/images/projects/<폴더>/<폴더>.md 내용 그대로
     no      : 카탈로그 번호 (클수록 최근 → 그리드 위쪽에 표시)
     folder  : 프로젝트 폴더 이름
     count   : 사진 장수 (1.jpg ~ n.jpg 순서대로 트레이에서 넘겨 봄)
     ratio   : 'w/h' (3:2 가로 → '3/2', 4:3 세로(P) → '3/4')
     link    : 없으면 '' → 트레이에서 제목 클릭 시 'NO Link!' 표시
     ※ 사진은 웹용으로 변환된 assets/images/web/<폴더>/ 를 사용합니다.
       새 사진을 넣었다면 tools/optimize-images.ps1 을 한 번 실행하세요. */
  works: [
    {
      no: 1, folder: '01 Shimokita', count: 4, ratio: '3/2',
      title: 'Shimo-Kitazawa Dreaming (...And Unreleased Demos)',
      desc: "Waveroad's 1st album",
      tag: 'Release',
      link: 'https://waveroad.bandcamp.com/album/shimo-kitazawa-dreaming-and-unreleased-demos',
    },
    {
      no: 2, folder: '02 you', count: 3, ratio: '3/2',
      title: '너',
      desc: 'Asahi OPT. 35mm f/3.5 & M645 Demo 1',
      tag: 'Photography',
      link: '',
    },
    {
      no: 3, folder: '03 nichijou', count: 2, ratio: '3/2',
      title: '日常の６４５',
      desc: 'M645 Demo 2',
      tag: 'Photography',
      link: '',
    },
    {
      no: 4, folder: '04 flitter', count: 3, ratio: '3/4',
      title: 'flitter',
      desc: 'Homage of the album "Fliitter" by Namitape',
      tag: 'Photography',
      link: 'https://namitape.bandcamp.com/album/flitter',
    },
    {
      no: 5, folder: '05 eunancore', count: 6, ratio: '3/4',
      title: 'eunancore',
      desc: 'Artist Photography for eunan',
      tag: 'Photography',
      link: '',
    },
    {
      no: 6, folder: '06 22th century concept', count: 5, ratio: '3/4',
      title: '22nd century concept',
      desc: 'Concept Photography with HNNN.2N/BLACKRUBBERSHOES_',
      tag: 'Photography',
      link: '',
    },
  ],
  worksImageRoot: 'assets/images/web/',

  /* Contact */
  contact: [
    { label: 'Instagram', links: [
      { text: 'oh.tyn',        href: 'https://www.instagram.com/oh.tyn/' },
      { text: 'oh.magazinne',  href: 'https://www.instagram.com/oh.magazinne/' },
    ] },
    { label: 'E-mail', links: [
      { text: 'zbezda00@khu.ac.kr', href: 'mailto:zbezda00@khu.ac.kr' },
    ] },
  ],
};
