import React, { useState, useEffect } from "react";

// ============================================================
// 仕事情報収集ダッシュボード
// - Claude.ai の Artifact として動く単一ファイルの React コンポーネント
// - localStorage / sessionStorage は使わず、window.storage API に保存する
// - 情報取得は Claude API（Web検索付き）経由で行う
// ============================================================

// --- パネルの定義（4枠）------------------------------------
// id: 内部で使う識別子 / name: 画面に出す名前
// instruction: Claude に渡す「検索指示」/ barColor: 左端のカラーバー色
// accentText / accentBg: 更新ボタンなどに使うアクセント色（パネルごとに1系統）
const PANELS = [
  {
    id: "wordpress",
    name: "WordPress",
    instruction:
      "WordPressのコアアップデート、主要プラグインの脆弱性・セキュリティ情報の最新ニュース",
    barColor: "bg-blue-500",
    accentText: "text-blue-700",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
  },
  {
    id: "hrtech",
    name: "HRテック業界",
    instruction:
      "日本国内のHRテック・HR SaaS企業のニュース（資金調達、新機能リリース、業界動向）",
    barColor: "bg-emerald-500",
    accentText: "text-emerald-700",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-200",
  },
  {
    id: "design",
    name: "Webデザイン",
    instruction:
      "Webデザイン・UIデザインのトレンド、参考になるサイト事例、Figmaのアップデート情報",
    barColor: "bg-violet-500",
    accentText: "text-violet-700",
    accentBg: "bg-violet-50",
    accentBorder: "border-violet-200",
  },
  {
    id: "custom",
    name: "自由枠",
    instruction: "", // 自由枠はユーザーが入力したキーワードから組み立てる
    barColor: "bg-amber-500",
    accentText: "text-amber-700",
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200",
  },
];

// window.storage に使うキー（1キーに全状態をまとめて入れる。レート制限対策）
const STORAGE_KEY = "dashboard-state";

// --- プロンプトを組み立てる ---------------------------------
// 検索指示を差し込んで、決まったJSON形式で返すよう指示する
function buildPrompt(instruction) {
  return `あなたは情報収集アシスタントです。Web検索を使って以下を調べてください。

${instruction}

直近1〜2週間の情報を優先してください。
結果は必ず次のJSON形式のみで返してください。前置き・後書き・Markdownのコードフェンスは一切不要です。

{
  "items": [
    {
      "title": "記事タイトル（日本語。原文が英語なら日本語に訳す）",
      "summary": "内容の要点を日本語2〜3文で",
      "url": "記事のURL",
      "source": "媒体名"
    }
  ]
}

itemsは3〜5件。確実な情報が見つからない場合はitemsを空配列にしてください。`;
}

// --- Claude API を呼んで記事リストを取得する ----------------
// 成功すると items 配列（[{title, summary, url, source}]）を返す
async function fetchItems(instruction) {
  // Claude API に Web検索付きでリクエスト（雛形どおり。APIキーは渡さない）
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", // モデル名は変更しない
      max_tokens: 1000, // 1000固定
      messages: [{ role: "user", content: buildPrompt(instruction) }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  const data = await response.json();

  // data.content は複数ブロックの配列。type==="text" のブロックだけを結合する
  // （順番に依存せず、テキストだけを取り出す）
  const text = data.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");

  // ```json や ``` のコードフェンスが混じっていても大丈夫なように除去してから
  // JSON.parse する
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // items が配列でなければ空配列として扱う
  return Array.isArray(parsed.items) ? parsed.items : [];
}

// --- 更新日時を「7/6 14:30 更新」の形にする ------------------
function formatUpdatedAt(iso) {
  if (!iso) return "未取得";
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm} 更新`;
}

// ============================================================
// 記事1件を表示する行
// ============================================================
function Article({ item, onToggleRead }) {
  return (
    <li className="border-t border-gray-100 py-2">
      <div className="flex items-start gap-2">
        {/* 既読チェックボックス（form は使わず onChange で処理） */}
        <input
          type="checkbox"
          checked={item.read}
          onChange={onToggleRead}
          className="mt-1 h-4 w-4 flex-none accent-gray-500"
        />
        <div className="min-w-0 flex-1">
          {/* タイトル＝リンク。新しいタブで開く。既読ならグレーアウト＋薄く */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={
              "block text-sm font-semibold leading-snug break-words " +
              (item.read
                ? "text-gray-400"
                : "text-gray-800 hover:text-gray-600 hover:underline")
            }
          >
            {item.title}
          </a>
          {/* 媒体名 */}
          {item.source ? (
            <div className="mt-0.5 text-xs text-gray-400">{item.source}</div>
          ) : null}
          {/* 要約（通常ウェイト・小さめ） */}
          <p
            className={
              "mt-1 text-xs leading-relaxed break-words " +
              (item.read ? "text-gray-400" : "text-gray-500")
            }
          >
            {item.summary}
          </p>
        </div>
      </div>
    </li>
  );
}

// ============================================================
// 控えめなスピナー（過剰な演出はしない）
// ============================================================
function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
  );
}

// ============================================================
// パネル1枚
// ============================================================
function Panel({
  config,
  panelState,
  loading,
  error,
  customKeyword,
  onUpdate,
  onToggleRead,
  onSaveKeyword,
}) {
  const items = panelState.items || [];
  const isCustom = config.id === "custom";

  // 自由枠のキーワード入力欄のローカル状態（保存前の編集中の値）
  const [draft, setDraft] = useState(customKeyword || "");
  // 外側のキーワードが変わったら入力欄も同期する
  useEffect(() => {
    setDraft(customKeyword || "");
  }, [customKeyword]);

  // 自由枠でキーワードが未設定なら更新ボタンを無効化する
  const noKeyword = isCustom && !(customKeyword && customKeyword.trim());
  const updateDisabled = loading || noKeyword;

  return (
    <section className="flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* 左端のカラーバー（パネルごとの色分け。これ以外の装飾色は使わない） */}
      <div className={"w-1 flex-none " + config.barColor} />

      <div className="flex min-w-0 flex-1 flex-col p-4">
        {/* ヘッダー：パネル名・更新日時・更新ボタン */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-800">{config.name}</h2>
            <p className="mt-0.5 font-mono text-xs text-gray-400">
              {formatUpdatedAt(panelState.updatedAt)}
            </p>
          </div>
          <button
            onClick={onUpdate}
            disabled={updateDisabled}
            className={
              "flex-none rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors " +
              (updateDisabled
                ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
                : config.accentBorder +
                  " " +
                  config.accentBg +
                  " " +
                  config.accentText +
                  " hover:opacity-80")
            }
          >
            更新
          </button>
        </div>

        {/* 自由枠だけ：キーワード入力欄と保存ボタン（form は使わない） */}
        {isCustom ? (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="キーワードを入力"
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-amber-300 focus:outline-none"
            />
            <button
              onClick={() => onSaveKeyword(draft.trim())}
              className="flex-none rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:opacity-80"
            >
              保存
            </button>
          </div>
        ) : null}

        {/* 本文エリア */}
        <div className="mt-3 flex-1">
          {/* ローディング中の表示（そのパネルだけ。控えめに） */}
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
              <Spinner />
              <span>検索中… 10〜30秒かかります</span>
            </div>
          ) : null}

          {/* エラー表示（前回の記事は消さずに残す。謝罪はしない） */}
          {error ? (
            <div className="mb-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              取得に失敗しました。もう一度お試しください
            </div>
          ) : null}

          {/* 自由枠でキーワード未設定のときの案内 */}
          {noKeyword ? (
            <p className="py-4 text-xs text-gray-400">
              キーワードを設定してください
            </p>
          ) : null}

          {/* 記事リスト or 「見つからなかった」表示 */}
          {!noKeyword && items.length > 0 ? (
            <ul>
              {items.map((item, i) => (
                <Article
                  key={item.url + i}
                  item={item}
                  onToggleRead={() => onToggleRead(i)}
                />
              ))}
            </ul>
          ) : null}

          {/* 取得済みだが空配列だったとき（ローディング中・未設定時は出さない） */}
          {!loading && !noKeyword && panelState.updatedAt && items.length === 0 ? (
            <p className="py-4 text-xs text-gray-400">
              新しい情報が見つかりませんでした
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// アプリ本体（default export・必須propsなし）
// ============================================================
export default function JobInfoDashboard() {
  // panels: 各パネルの取得結果と更新日時
  // customKeyword: 自由枠のキーワード
  const [panels, setPanels] = useState(() => {
    // 初期状態は全パネル空
    const init = {};
    PANELS.forEach((p) => {
      init[p.id] = { updatedAt: null, items: [] };
    });
    return init;
  });
  const [customKeyword, setCustomKeyword] = useState("");

  // パネルごとに独立したローディング・エラー状態を持つ
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  // 起動時に window.storage から前回の状態を読み込む
  useEffect(() => {
    async function load() {
      try {
        // 保存済みデータを取得（await 必須・shared は常に false）
        const result = await window.storage.get(STORAGE_KEY, false);
        const saved = JSON.parse(result.value);
        if (saved.panels) setPanels(saved.panels);
        if (typeof saved.customKeyword === "string")
          setCustomKeyword(saved.customKeyword);
      } catch (e) {
        // 初回起動時はキーが無く storage.get がエラーを投げる。
        // その場合は初期状態のまま使う（アプリは落とさない）。
      }
    }
    load();
  }, []);

  // --- 現在の状態を window.storage に保存する ----------------
  // panels と customKeyword を組み合わせて1キーにまとめて書き込む
  async function persist(nextPanels, nextKeyword) {
    const state = { panels: nextPanels, customKeyword: nextKeyword };
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(state), false);
    } catch (e) {
      // 保存に失敗しても画面表示は続ける
    }
  }

  // --- パネルを更新する（更新ボタンの処理）------------------
  async function handleUpdate(panelId) {
    // 更新中はボタンを無効化しているので多重リクエストは起きないが念のため
    if (loading[panelId]) return;

    const config = PANELS.find((p) => p.id === panelId);
    // 自由枠はキーワードから検索指示を組み立てる
    const instruction =
      panelId === "custom"
        ? `${customKeyword} に関する最新情報`
        : config.instruction;

    // このパネルだけローディング開始・エラーはクリア
    setLoading((prev) => ({ ...prev, [panelId]: true }));
    setError((prev) => ({ ...prev, [panelId]: false }));

    try {
      // API 呼び出し＋パース
      const newItems = await fetchItems(instruction);

      // 前回と同じURLの記事があれば既読状態を引き継ぐ
      const prevItems = panels[panelId].items || [];
      const readByUrl = {};
      prevItems.forEach((it) => {
        readByUrl[it.url] = it.read;
      });
      const merged = newItems.map((it) => ({
        title: it.title,
        summary: it.summary,
        url: it.url,
        source: it.source,
        read: readByUrl[it.url] || false, // 引き継ぎ（無ければ未読）
      }));

      // 記事リストを置き換え（追記ではない）＋更新日時を記録
      const nextPanels = {
        ...panels,
        [panelId]: { updatedAt: new Date().toISOString(), items: merged },
      };
      setPanels(nextPanels);
      // 結果を保存
      await persist(nextPanels, customKeyword);
    } catch (e) {
      // 失敗時はエラー表示。前回の記事リストは残す
      setError((prev) => ({ ...prev, [panelId]: true }));
    } finally {
      // ローディング終了
      setLoading((prev) => ({ ...prev, [panelId]: false }));
    }
  }

  // --- 既読チェックのトグル ----------------------------------
  async function handleToggleRead(panelId, index) {
    const target = panels[panelId];
    const newItems = target.items.map((it, i) =>
      i === index ? { ...it, read: !it.read } : it
    );
    const nextPanels = {
      ...panels,
      [panelId]: { ...target, items: newItems },
    };
    setPanels(nextPanels);
    // 既読状態は即座に保存する
    await persist(nextPanels, customKeyword);
  }

  // --- 自由枠のキーワード保存 --------------------------------
  async function handleSaveKeyword(keyword) {
    setCustomKeyword(keyword);
    // キーワードを永続化
    await persist(panels, keyword);
  }

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        {/* ヘッダー */}
        <header className="mb-5">
          <h1 className="text-lg font-bold text-gray-800">仕事情報ダッシュボード</h1>
          <p className="mt-1 text-xs text-gray-400">
            気になるトピックの最新情報をまとめて確認できます。
          </p>
        </header>

        {/* デスクトップは2×2グリッド、モバイル（md未満）は1カラム縦積み */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PANELS.map((config) => (
            <Panel
              key={config.id}
              config={config}
              panelState={panels[config.id]}
              loading={!!loading[config.id]}
              error={!!error[config.id]}
              customKeyword={customKeyword}
              onUpdate={() => handleUpdate(config.id)}
              onToggleRead={(index) => handleToggleRead(config.id, index)}
              onSaveKeyword={handleSaveKeyword}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
