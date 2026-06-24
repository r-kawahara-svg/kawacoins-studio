// db/seeds/affiliates.ts
// 松井証券中心のA8案件。a8mat はDB重複登録防止のキー（html_snippet内に含まれる）。
export type AffiliateSeed = {
  a8mat: string; name: string; asp: string; adType: 'text' | 'banner';
  themes: string[]; active: boolean; payout: number | null; note: string; htmlSnippet: string;
};

export const affiliateSeeds: AffiliateSeed[] = [
  {
    a8mat: "45DXI8+B2WG36+3XCC+64C3M",
    name: "松井証券 口座開設",
    asp: "a8",
    adType: 'text',
    themes: ["証券口座", "個別株", "スイング", "nisa", "投資信託", "ipo"],
    active: true,
    payout: null,
    note: "松井のオールラウンド口座開設。本文差し込みの主力テキストリンク",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B2WG36+3XCC+64C3M" rel="nofollow">松井証券</a>
<img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=45DXI8+B2WG36+3XCC+64C3M" alt="">`,
  },
  {
    a8mat: "45DXI8+B2WG36+3XCC+6P4K1",
    name: "松井証券 口座開設",
    asp: "a8",
    adType: 'banner',
    themes: ["証券口座", "nisa"],
    active: true,
    payout: null,
    note: "728x90 リーダーボード。見出し上向き",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B2WG36+3XCC+6P4K1" rel="nofollow">
<img border="0" width="728" height="90" alt="" src="https://www23.a8.net/svt/bgt?aid=250912736670&wid=001&eno=01&mid=s00000018318001125000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www19.a8.net/0.gif?a8mat=45DXI8+B2WG36+3XCC+6P4K1" alt="">`,
  },
  {
    a8mat: "45DXI8+B2WG36+3XCC+6IP2P",
    name: "松井証券 口座開設",
    asp: "a8",
    adType: 'banner',
    themes: ["投資信託"],
    active: true,
    payout: null,
    note: "468x60",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B2WG36+3XCC+6IP2P" rel="nofollow">
<img border="0" width="468" height="60" alt="" src="https://www26.a8.net/svt/bgt?aid=250912736670&wid=001&eno=01&mid=s00000018318001095000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www19.a8.net/0.gif?a8mat=45DXI8+B2WG36+3XCC+6IP2P" alt="">`,
  },
  {
    a8mat: "45DXI8+B2WG36+3XCC+6HMHT",
    name: "松井証券 口座開設",
    asp: "a8",
    adType: 'banner',
    themes: ["ipo", "個別株"],
    active: true,
    payout: null,
    note: "300x250 レクタングル",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B2WG36+3XCC+6HMHT" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www28.a8.net/svt/bgt?aid=250912736670&wid=001&eno=01&mid=s00000018318001090000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www15.a8.net/0.gif?a8mat=45DXI8+B2WG36+3XCC+6HMHT" alt="">`,
  },
  {
    a8mat: "451A36+Z4LGY+3XCC+BXQOI",
    name: "松井証券 iDeCo",
    asp: "a8",
    adType: 'text',
    themes: ["ideco"],
    active: true,
    payout: null,
    note: "iDeCo本文用テキスト",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=451A36+Z4LGY+3XCC+BXQOI" rel="nofollow">iDeCoならポイントが貯まる松井証券</a>
<img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=451A36+Z4LGY+3XCC+BXQOI" alt="">`,
  },
  {
    a8mat: "451A36+Z4LGY+3XCC+BYT9D",
    name: "松井証券 iDeCo",
    asp: "a8",
    adType: 'banner',
    themes: ["ideco"],
    active: true,
    payout: null,
    note: "iDeCo 300x250",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=451A36+Z4LGY+3XCC+BYT9D" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www25.a8.net/svt/bgt?aid=250322514059&wid=001&eno=01&mid=s00000018318002010000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www18.a8.net/0.gif?a8mat=451A36+Z4LGY+3XCC+BYT9D" alt="">`,
  },
  {
    a8mat: "45DXI8+B3HVOY+5PYG+5YRHE",
    name: "ALTERNA（三井物産デジタル証券）",
    asp: "a8",
    adType: 'text',
    themes: [], // 暫定のため自動挿入対象外（active=trueは維持、手動利用は可）
    active: true,
    payout: null,
    note: "暫定タグ。オルタナ資産。要見直し",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B3HVOY+5PYG+5YRHE" rel="nofollow">預金でも株でもない、安定資産という新しい選択肢</a>
<img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=45DXI8+B3HVOY+5PYG+5YRHE" alt="">`,
  },
  {
    a8mat: "45DXI8+B3HVOY+5PYG+5YZ75",
    name: "ALTERNA（三井物産デジタル証券）",
    asp: "a8",
    adType: 'banner',
    themes: [], // 暫定のため自動挿入対象外
    active: true,
    payout: null,
    note: "暫定。300x250",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B3HVOY+5PYG+5YZ75" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www23.a8.net/svt/bgt?aid=250912736671&wid=001&eno=01&mid=s00000026692001003000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www12.a8.net/0.gif?a8mat=45DXI8+B3HVOY+5PYG+5YZ75" alt="">`,
  },
  {
    a8mat: "45DXI8+B1PKVM+ONS+5ZMCI",
    name: "FX投資マスターガイド",
    asp: "a8",
    adType: 'text',
    themes: ["fx"],
    active: true,
    payout: null,
    note: "無料eBookリード。FX記事用",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B1PKVM+ONS+5ZMCI" rel="nofollow">FX投資マスターガイド無料提供中！（図解オールカラー128ページ）</a>
<img border="0" width="1" height="1" src="https://www19.a8.net/0.gif?a8mat=45DXI8+B1PKVM+ONS+5ZMCI" alt="">`,
  },
  {
    a8mat: "45DXI8+B1PKVM+ONS+69HA9",
    name: "FX投資マスターガイド",
    asp: "a8",
    adType: 'banner',
    themes: ["fx"],
    active: true,
    payout: null,
    note: "300x250",
    htmlSnippet: `<a href="https://px.a8.net/svt/ejp?a8mat=45DXI8+B1PKVM+ONS+69HA9" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www23.a8.net/svt/bgt?aid=250912736668&wid=001&eno=01&mid=s00000003196001052000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=45DXI8+B1PKVM+ONS+69HA9" alt="">`,
  },
];
