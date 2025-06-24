// Google Apps Script (GAS) backend for ちゃチャットLite

// Web アプリケーションとしてデプロイ時の設定
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ちゃチャットLite')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// OpenAI API へのリクエスト処理
function callOpenAI(apiKey, messages, model, temperature, maxTokens = 3000) {
  const apiUrl = "https://api.openai.com/v1/chat/completions";
  
  const payload = {
    model: model,
    messages: messages,
    temperature: temperature,
    max_tokens: maxTokens
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { error: error.toString() };
  }
}

// 特定のモデルを指定してOpenAI APIを呼び出す関数
// GPT-4oなど別のモデルを使用するための関数
function callOpenAIWithModel(apiKey, messages, modelName, temperature, maxTokens = 3000) {
  const apiUrl = "https://api.openai.com/v1/chat/completions";
  
  const payload = {
    model: modelName,
    messages: messages,
    temperature: temperature,
    max_tokens: maxTokens
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { error: error.toString() };
  }
}

// GPT-4oモデル定数
const gpt4oModel = "gpt-4o";

// 会話要約を取得する関数
function getConversationSummary(apiKey, recentMessages) {
  const systemPrompt = `
あなたは優秀な会話要約AIです。以下の会話履歴を200文字以内で簡潔に要約してください。
要約は必ず日本語で出力し、重要なポイントや感情、場面の状況を含めてください。
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...recentMessages
  ];

  try {
    const result = callOpenAIWithModel(apiKey, messages, gpt4oModel, 0.7, 1000);
    if (result.error) {
      console.error("会話要約エラー:", result.error);
      return null;
    }
    return result.choices[0].message.content;
  } catch (e) {
    console.error("会話要約処理エラー:", e);
    return null;
  }
}

// 次の物語展開予測を取得する関数
function getNextPlotSuggestion(apiKey, characterPrompt, conversationSummary, recentMessages) {
  const STORY_PROMPT = `
You are a creative story planner.  
Based on the summary below, suggest what naturally happens next.  
Output only a single short sentence in Japanese that describes the next event, situation, or shift in the story.  
Make it specific, story-driven, and emotionally or dramatically meaningful.  
Do not write full prose, narration, or dialogue.  
Examples: 「敵が背後から忍び寄る」「少女が秘密を打ち明けようとする」「時間が止まる」「誰かの叫びが聞こえる」.
`;

  const systemPrompt = STORY_PROMPT;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `
【キャラクター設定】
${characterPrompt}

【直近の会話要約】
${conversationSummary || "（会話要約なし）"}

【最近の会話（最新3件）】
${recentMessages.map(m => `${m.role === 'assistant' ? 'キャラクター' : 'ユーザー'}: ${m.content}`).join('\n\n')}

以上の情報に基づいて、この物語が自然に展開していく方向性を予測し、必ず日本語で回答してください。
` }
  ];

  try {
    const result = callOpenAIWithModel(apiKey, messages, gpt4oModel, 0.8, 1000);
    if (result.error) {
      console.error("物語展開予測エラー:", result.error);
      return null;
    }
    return result.choices[0].message.content;
  } catch (e) {
    console.error("物語展開予測処理エラー:", e);
    return null;
  }
}

// PropertiesService を使ったデータの保存
function saveUserData(key, value) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(key, value);
  return { success: true };
}

// PropertiesService からデータの取得
function getUserData(key) {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty(key);
}

// 全ユーザーデータの取得
function getAllUserData() {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperties();
}

// ユーザーデータのクリア
function clearUserData() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteAllProperties();
  return { success: true };
}

// バックアップの作成
function createBackupData() {
  const userProperties = PropertiesService.getUserProperties();
  const allData = userProperties.getProperties();
  
  return {
    timestamp: new Date().toISOString(),
    data: allData,
    version: "1.0"
  };
}

// バックアップからの復元
function restoreFromBackup(backupData) {
  if (!backupData || !backupData.data) {
    return { success: false, message: "無効なバックアップデータです" };
  }
  
  try {
    const userProperties = PropertiesService.getUserProperties();
    
    // 既存のデータをクリア
    userProperties.deleteAllProperties();
    
    // バックアップから復元
    userProperties.setProperties(backupData.data);
    
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// 単一のユーザーデータを取得
function getSingleUserData(key) {
  const userProperties = PropertiesService.getUserProperties();
  const value = userProperties.getProperty(key);
  
  // キーが見つかった場合はオブジェクトとして返す
  if (value !== null) {
    const result = {};
    result[key] = value;
    return result;
  }
  
  return null;
} 