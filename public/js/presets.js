const PRESETS = {
  presenterRoles: [
    { id: 'teacher', label: '👨‍🏫 教師', tone: '引導式、循序漸進' },
    { id: 'student', label: '🎓 學生', tone: '展示學習成果、同儕分享' },
    { id: 'researcher', label: '🔬 研究者', tone: '數據驅動、假設驗證' },
    { id: 'consultant', label: '💼 顧問', tone: '問題解決、策略建議' },
    { id: 'storyteller', label: '📖 故事家', tone: '敘事弧線、情感連結' },
    { id: 'trainer', label: '🏋️ 培訓師', tone: '實操演練、技能養成' },
    { id: 'pitch_maker', label: '🚀 提案者', tone: '價值主張、行動呼籲' },
    { id: 'facilitator', label: '🤝 引導師', tone: '問題框架、共創討論' }
  ],
  audienceProfiles: [
    { id: 'elementary', label: '🧒 國小生', traits: '視覺豐富、互動遊戲化、短注意力', category: '教育類' },
    { id: 'middle_school', label: '🧑‍🎓 國中生', traits: '探索好奇、需要明確結構', category: '教育類' },
    { id: 'high_school', label: '📚 高中生', traits: '邏輯思辨、考試導向', category: '教育類' },
    { id: 'college', label: '🎓 大學生', traits: '學術深度、批判思考', category: '教育類' },
    { id: 'special_ed', label: '💛 特教生', traits: '多感官輸入、重複強化、簡化結構、具體化抽象', category: '教育類' },
    { id: 'executives', label: '👔 高階主管', traits: '時間有限、只看結論與ROI', category: '職場類' },
    { id: 'team_members', label: '👥 團隊成員', traits: '需要 actionable takeaways', category: '職場類' },
    { id: 'clients', label: '🤝 客戶', traits: '關注價值與信任', category: '職場類' },
    { id: 'general_public', label: '🌍 一般大眾', traits: '淺顯易懂、引人入勝', category: '職場類' },
    { id: 'tech_audience', label: '💻 技術人員', traits: '重視細節、可執行性', category: '職場類' }
  ],
  contexts: [
    { id: 'classroom', label: '🏫 課堂教學' },
    { id: 'workshop', label: '🔧 工作坊' },
    { id: 'keynote', label: '🎤 主題演講' },
    { id: 'team_meeting', label: '📋 團隊會議' },
    { id: 'sales_pitch', label: '💰 銷售提案' },
    { id: 'training', label: '📝 培訓課程' },
    { id: 'conference', label: '🎪 研討會發表' },
    { id: 'parent_meeting', label: '👨‍👩‍👧 家長會' },
    { id: 'iep_meeting', label: '📑 IEP 會議' }
  ],
  visualStyles: [
    { id: 'warm_pro', label: '💼 溫暖專業', css: 'warm' },
    { id: 'minimal_tech', label: '🤖 極簡科技', css: 'tech' },
    { id: 'retro_collage', label: '🎞️ 復古拼貼', css: 'retro' },
    { id: 'hand_drawn', label: '✏️ 溫馨手繪', css: 'sketch' },
    { id: 'q_cute', label: '🧸 Q版可愛', css: 'cute' },
    { id: 'watercolor', label: '🎨 手繪水彩', css: 'watercolor' },
    { id: 'clay_3d', label: '🧱 黏土風', css: 'clay' },
    { id: 'edu_comic', label: '💭 教育漫畫', css: 'comic' },
    { id: 'paper_cut', label: '✂️ 剪紙藝術', css: 'papercut' },
    { id: 'retro_poster', label: '📢 復古海報', css: 'poster' },
    { id: 'infographic', label: '📊 資訊圖表', css: 'infographic' },
    { id: 'magazine', label: '📰 雜誌排版', css: 'magazine' },
    { id: 'neon_dark', label: '🌃 霓虹暗黑', css: 'neon' },
    { id: 'nature_organic', label: '🌿 自然有機', css: 'organic' },
    { id: 'blueprint', label: '📐 藍圖工程', css: 'blueprint' }
  ]
};
