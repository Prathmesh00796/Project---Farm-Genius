import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLang } from "./LangContext";

const AgentGuideContext = createContext(null);

export const TOUR_DATA = {
  disease: {
    id: "disease",
    path: "/disease",
    title: {
      mr: "🍃 पान डॉक्टर (रोग तपासणी मार्गदर्शक)",
      hi: "🍃 पत्ती डॉक्टर (रोग जांच मार्गदर्शक)",
      en: "🍃 Leaf Doctor (Plant Disease Guide)",
    },
    steps: [
      {
        title: {
          mr: "पायरी १: आधी तुमचे पीक निवडा 🌾",
          hi: "चरण १: पहले अपनी फसल चुनें 🌾",
          en: "Step 1: Select Your Crop First 🌾",
        },
        desc: {
          mr: "ड्रॉपडाऊनवर क्लिक करून तुमच्या शेतातील पीक निवडा (उदा. कापूस, सोयाबीन, ऊस, भात, मका किंवा गहू). यामुळे अचूक रोग तपासता येतो.",
          hi: "ड्रॉपडाउन से अपनी फसल चुनें (जैसे कपास, सोयाबीन, गन्ना, धान, मक्का या गेहूं).",
          en: "Select your crop from the dropdown (Cotton, Soybean, Sugarcane, Rice, Maize, or Wheat) to ensure accurate disease matching.",
        },
        speech: {
          mr: "सर्वप्रथम 'हे पान कोणत्या पिकाचे आहे' येथे तुमचे पीक निवडा.",
          hi: "सबसे पहले अपनी फसल का नाम चुनें.",
          en: "First select your crop from the dropdown.",
        },
      },
      {
        title: {
          mr: "पायरी २: रोगट पानाचा स्पष्ट फोटो घ्या 📸",
          hi: "चरण २: रोगी पत्ते की साफ़ तस्वीर लें 📸",
          en: "Step 2: Upload Clear Leaf Photo 📸",
        },
        desc: {
          mr: "कॅमेरा किंवा फोटो बॉक्सवर क्लिक करा. मोबाईलने पानाचा जवळून, चांगल्या उजेडात आणि रोग दिसणारा फोटो अपलोड करा.",
          hi: "फोटो बॉक्स पर क्लिक करके पत्ते की स्पष्ट और नज़दीकी तस्वीर अपलोड करें.",
          en: "Click the photo box to upload a close-up, sharp photo of the infected leaf.",
        },
        speech: {
          mr: "आता रोग पडलेल्या पानाचा जवळून आणि स्पष्ट फोटो अपलोड करा.",
          hi: "अब रोगी पत्ते की साफ़ तस्वीर अपलोड करें.",
          en: "Now upload a clear and focused photo of the diseased leaf.",
        },
      },
      {
        title: {
          mr: "पायरी ३: निकाल आणि औषध फवारणी पाहा 🔍",
          hi: "चरण ३: परिणाम और उपचार देखें 🔍",
          en: "Step 3: View Diagnosis & Treatment 🔍",
        },
        desc: {
          mr: "'निकाल दाखवा' बटनावर दाबा. सिस्टम तुम्हाला रोगाचे नाव, सेंद्रिय उपाय (Organic) आणि अधिकृत रासायनिक फवारणी (Chemical) लगेच दाखवेल!",
          hi: "'निकाल दाखवा' पर क्लिक करें। आपको रोग का नाम, जैविक और रासायनिक उपचार तुरंत दिखेगा!",
          en: "Click 'Show result' to see instant disease diagnosis, organic remedies, and chemical spray steps.",
        },
        speech: {
          mr: "शेवटी निकाल दाखवा बटनावर दाबा. तुम्हाला रोगाचे नाव आणि फवारणी समजेल.",
          hi: "अंत में परिणाम देखें बटन दबाएं।",
          en: "Finally click Show Result to view diagnosis and spray advice.",
        },
      },
    ],
  },
  recommend: {
    id: "recommend",
    path: "/recommend",
    title: {
      mr: "🌱 कोणते पीक योग्य? (पीक शिफारस मार्गदर्शक)",
      hi: "🌱 कौन सी फसल सही है? (फसल अनुशंसा मार्गदर्शक)",
      en: "🌱 Which Crop Fits? (Soil Guide)",
    },
    steps: [
      {
        title: {
          mr: "पायरी १: जवळचा जिल्हा निवडा 📍",
          hi: "चरण १: नजदीकी जिला चुनें 📍",
          en: "Step 1: Pick District for Weather 📍",
        },
        desc: {
          mr: "येथे तुमचा जिल्हा निवडा जेणेकरून आजच्या स्थानिक तापमानाचा व पावसाचा विचार पीक सुचवताना केला जाईल.",
          hi: "मौसम और बारिश के अनुमान के लिए अपना जिला चुनें।",
          en: "Choose your nearest Maharashtra district hub to factor in today's weather.",
        },
        speech: {
          mr: "आधी तुमचा जिल्हा निवडा जेणेकरून हवामानाचा अंदाज घेतला जाईल.",
          hi: "पहले अपना जिला चुनें।",
          en: "Select your district hub for weather data.",
        },
      },
      {
        title: {
          mr: "पायरी २: माती आरोग्य पत्रिकेची माहिती भरा 🧪",
          hi: "चरण २: मिट्टी परीक्षण के आंकड़े भरें 🧪",
          en: "Step 2: Enter Soil Card Numbers 🧪",
        },
        desc: {
          mr: "तुमच्या माती परीक्षणानुसार N (नायट्रोजन), P (फॉस्फरस), K (पोटॅश), सामू (pH) आणि ओलावा टाका.",
          hi: "अपनी मिट्टी जांच रिपोर्ट से N, P, K और pH के अंक भरें।",
          en: "Enter N, P, K, pH and moisture from your Soil Health Card.",
        },
        speech: {
          mr: "माती आरोग्य पत्रिकेनुसार नायट्रोजन, फॉस्फरस, पोटॅश आणि सामू भरा.",
          hi: "मिट्टी कार्ड के अनुसार आंकड़े भरें।",
          en: "Fill in nutrient levels from your soil card.",
        },
      },
      {
        title: {
          mr: "पायरी ३: पिकाची सूचना पाहा 🌾",
          hi: "चरण ३: सर्वोत्तम फसल देखें 🌾",
          en: "Step 3: Get Matching Crop 🌾",
        },
        desc: {
          mr: "'पिकाची सूचना पाहा' बटनावर क्लिक करा. तुमच्या शेताच्या मातीसाठी सर्वात जास्त उत्पादन देणारे पीक समोर येईल.",
          hi: "'पिकाची सूचना पाहा' बटन दबाएं और सबसे उपयुक्त फसल जानें।",
          en: "Click 'Show matching crop ideas' to see the recommended crop for your field.",
        },
        speech: {
          mr: "पिकाची सूचना पाहा वर क्लिक करा. तुमच्या जमिनीसाठी योग्य पीक दिसेल.",
          hi: "पिकाची सूचना पाहा पर क्लिक करें।",
          en: "Click Show Matching Crop ideas.",
        },
      },
    ],
  },
  yield: {
    id: "yield",
    path: "/yield",
    title: {
      mr: "📦 उत्पादन अंदाज (उत्पन्न हिशोब मार्गदर्शक)",
      hi: "📦 उत्पादन अनुमान (उपज कैलकुलेटर)",
      en: "📦 Yield Idea (Harvest Calculator)",
    },
    steps: [
      {
        title: {
          mr: "पायरी १: पीक आणि क्षेत्रफळ निवडा 🚜",
          hi: "चरण १: फसल और रकबा दर्ज करें 🚜",
          en: "Step 1: Select Crop & Land Area 🚜",
        },
        desc: {
          mr: "तुमचे पीक निवडा आणि तुमचे शेत किती हेक्टर आहे ते टाका (१ हेक्टर = अंदाजे २.४७ एकर).",
          hi: "फसल चुनें और अपनी जमीन का क्षेत्रफल (हेक्टेयर में) लिखें।",
          en: "Pick your crop and enter your land area in hectares.",
        },
        speech: {
          mr: "पीक निवडा आणि तुमचे क्षेत्रफळ हेक्टरमध्ये लिहा.",
          hi: "फसल और क्षेत्रफल चुनें।",
          en: "Select your crop and land size in hectares.",
        },
      },
      {
        title: {
          mr: "पायरी २: पावसाचा अंदाज टाका 🌧️",
          hi: "चरण २: बारिश का अनुमान लिखें 🌧️",
          en: "Step 2: Enter Season Rain 🌧️",
        },
        desc: {
          mr: "हंगामातील अंदाजे पाऊस (मिमी) टाका. पाऊस पिकाच्या उत्पादनावर थेट परिणाम करतो.",
          hi: "सीजन में होने वाली बारिश (मिमी) का अनुमान भरें।",
          en: "Enter the seasonal rainfall estimate in millimeters.",
        },
        speech: {
          mr: "हंगामातील अंदाजे पाऊस मिलीमीटरमध्ये भरा.",
          hi: "अनुमानित बारिश मिलीमीटर में दर्ज करें।",
          en: "Enter seasonal rainfall in millimeters.",
        },
      },
      {
        title: {
          mr: "पायरी ३: अंदाजे उत्पादन आणि नफा पाहा 💰",
          hi: "चरण ३: संभावित उपज और आय देखें 💰",
          en: "Step 3: Calculate Yield & Revenue 💰",
        },
        desc: {
          mr: "'उत्पादन अंदाज शोधा' वर क्लिक करा. तुम्हाला प्रति हेक्टर व एकूण क्षेत्रावरील क्विंटल उत्पादन आणि अंदाजे उत्पन्न ₹ समजेल.",
          hi: "'उत्पादन अंदाज शोधा' पर क्लिक करें। कुल क्विंटल और अनुमानित कमाई दिखेगी।",
          en: "Click 'Show yield idea' to see estimated quintals and approximate revenue in rupees.",
        },
        speech: {
          mr: "उत्पादन अंदाज शोधा वर क्लिक करा. अपेक्षित क्विंटल आणि उत्पन्न दिसेल.",
          hi: "उत्पादन अंदाज शोधा पर क्लिक करें।",
          en: "Click Show yield idea to view expected yield and earnings.",
        },
      },
    ],
  },
  market: {
    id: "market",
    path: "/market",
    title: {
      mr: "🏪 बाजार पाटी (खरेदी-विक्री मार्गदर्शक)",
      hi: "🏪 बाज़ार पाटी (खरीद-बिक्री मार्गदर्शक)",
      en: "🏪 Local Marketboard Guide",
    },
    steps: [
      {
        title: {
          mr: "पायरी १: शेतीमालाची नोंदणी 🛒",
          hi: "चरण १: फसल बिक्री दर्ज करें 🛒",
          en: "Step 1: List Crop for Sale 🛒",
        },
        desc: {
          mr: "शेतकरी म्हणून लॉगिन केल्यानंतर 'विक्रीची नोंद' फॉर्म दिसेल. येथे पीक, वजन (किलो) आणि अपेक्षित भाव टाका.",
          hi: "लॉगिन करने के बाद फसल, वजन (किलो) और मनचाहा भाव दर्ज करें।",
          en: "Log in as a farmer to post crop name, quantity (kg), and asking price per kg.",
        },
        speech: {
          mr: "शेतीमाल विकण्यासाठी लॉगिन करून विक्रीची नोंद करा.",
          hi: "फसल बेचने के लिए लॉगिन करके बिक्री की जानकारी भरें।",
          en: "Login to list your crop, quantity, and asking price.",
        },
      },
      {
        title: {
          mr: "पायरी २: खरेदीदार आणि व्यापारी थेट संपर्क 🤝",
          hi: "चरण २: सीधे व्यापारी से संपर्क 🤝",
          en: "Step 2: Direct Buyer Contact 🤝",
        },
        desc: {
          mr: "तुमचा माल फलकावर दिसेल. नोंदणीकृत खरेदीदार आणि व्यापारी थेट तुमच्याशी फोनवर संपर्क साधून व्यवहार ठरवतील.",
          hi: "व्यापारी आपकी फसल देखकर सीधे आपसे संपर्क करेंगे।",
          en: "Local buyers and dealers see your listing and connect with you directly.",
        },
        speech: {
          mr: "नोंदणी होताच खरेदीदार थेट तुमच्याशी फोनवर संपर्क करतील.",
          hi: "व्यापारी सीधे आपसे संपर्क करेंगे।",
          en: "Buyers will see your listing and call you directly.",
        },
      },
    ],
  },
};

export function AgentGuideProvider({ children }) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTour, setActiveTour] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  // Function to speak Marathi/Hindi/English voice using Web Speech API
  const speakText = useCallback(
    (text) => {
      if (!isVoiceEnabled || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = 0.95; // Slightly slower and clearer for farmers
      window.speechSynthesis.speak(utterance);
    },
    [isVoiceEnabled, lang]
  );

  // Start tour and navigate to that page immediately
  const startTour = useCallback(
    (featureKey) => {
      const tour = TOUR_DATA[featureKey];
      if (!tour) return;

      setActiveTour(tour);
      setCurrentStep(0);

      // Navigate to the target page if not already there
      if (location.pathname !== tour.path) {
        navigate(tour.path);
      }

      // Voice prompt for step 1
      const initialStep = tour.steps[0];
      const speechMsg =
        initialStep.speech[lang] || initialStep.speech.mr || initialStep.desc[lang];
      setTimeout(() => speakText(speechMsg), 600);
    },
    [location.pathname, navigate, lang, speakText]
  );

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStep < activeTour.steps.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      const step = activeTour.steps[nextIdx];
      const speechMsg = step.speech[lang] || step.speech.mr || step.desc[lang];
      speakText(speechMsg);
    } else {
      endTour();
    }
  }, [activeTour, currentStep, lang, speakText]);

  const prevStep = useCallback(() => {
    if (!activeTour || currentStep <= 0) return;
    const prevIdx = currentStep - 1;
    setCurrentStep(prevIdx);
    const step = activeTour.steps[prevIdx];
    const speechMsg = step.speech[lang] || step.speech.mr || step.desc[lang];
    speakText(speechMsg);
  }, [activeTour, currentStep, lang, speakText]);

  const endTour = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActiveTour(null);
    setCurrentStep(0);
  }, []);

  return (
    <AgentGuideContext.Provider
      value={{
        activeTour,
        currentStep,
        startTour,
        nextStep,
        prevStep,
        endTour,
        isVoiceEnabled,
        setIsVoiceEnabled,
      }}
    >
      {children}
    </AgentGuideContext.Provider>
  );
}

export function useAgentGuide() {
  const ctx = useContext(AgentGuideContext);
  if (!ctx) throw new Error("useAgentGuide requires AgentGuideProvider");
  return ctx;
}
