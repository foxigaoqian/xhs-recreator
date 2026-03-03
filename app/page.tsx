'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, RefreshCw, Copy, Image as ImageIcon, ExternalLink, AlertCircle, Check, Settings2, ChevronDown, X, Sparkles, Download } from 'lucide-react';
import { scrapeXhsNote, urlToBase64, type ScrapedData } from './actions';
import Image from 'next/image';

interface GeneratedResult {
  title: string;
  content: string;
  tags: string[];
  imagePlan: {
    prompt: string;
    promptZh: string;
    referenceImageIndex?: number;
    reason: string;
  }[];
  imageUrls?: string[];
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);
  
  const [style, setStyle] = useState('creative');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customModel, setCustomModel] = useState('gemini-3-flash-preview'); // Default text model
  const [customImageModel, setCustomImageModel] = useState('gemini-3.1-flash-image-preview'); // Default image model

  const [loadingStep, setLoadingStep] = useState<'idle' | 'scraping' | 'generating_text' | 'generating_image'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null); // Separate error for images
  
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('xhs_custom_api_key');
    const savedUrl = localStorage.getItem('xhs_custom_base_url');
    const savedModel = localStorage.getItem('xhs_custom_model');
    const savedImageModel = localStorage.getItem('xhs_custom_image_model');
    
    if (savedKey) setCustomApiKey(savedKey);
    if (savedUrl) setCustomBaseUrl(savedUrl);
    if (savedModel) setCustomModel(savedModel);
    if (savedImageModel) setCustomImageModel(savedImageModel);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('xhs_custom_api_key', customApiKey);
    localStorage.setItem('xhs_custom_base_url', customBaseUrl);
    localStorage.setItem('xhs_custom_model', customModel);
    localStorage.setItem('xhs_custom_image_model', customImageModel);
    setShowSettings(false);
  };

  const resetSettings = () => {
    setCustomApiKey('');
    setCustomBaseUrl('');
    setCustomModel('gemini-3-flash-preview');
    setCustomImageModel('gemini-3.1-flash-image-preview');
    localStorage.removeItem('xhs_custom_api_key');
    localStorage.removeItem('xhs_custom_base_url');
    localStorage.removeItem('xhs_custom_model');
    localStorage.removeItem('xhs_custom_image_model');
    setShowSettings(false);
  };

  const formatApiError = (error: any): string => {
    const msg = error.message || '';
    const status = error.status;

    if (status === 401 || msg.includes('API key not valid') || msg.includes('unauthenticated')) {
      return 'API Key 无效 (401)。请检查您的 Key 是否正确。';
    }
    if (status === 403 || msg.includes('permission denied') || msg.includes('leaked')) {
      const baseMsg = 'API Key 权限不足或被标记为泄露 (403)。';
      const notQuotaMsg = '注意：这不是“额度用完”，而是该 Key 已被 Google 封禁，无法再使用。';
      
      if (customBaseUrl) {
        if (customBaseUrl.includes('12ai.org')) {
             return `权限不足 (403)。您正在使用 12ai.org 中转。Google 返回 "Key Leaked"。说明该中转站的 Key 已被封禁。${notQuotaMsg}请联系客服更换。`;
        }
        return `${baseMsg}如果您使用中转服务，说明服务商的 Key 已失效。${notQuotaMsg}请更换 Key。`;
      }
      return `${baseMsg}${notQuotaMsg}请更换 API Key。`;
    }
    if (status === 404 || msg.includes('not found')) {
      return '请求的模型未找到 (404)。可能是 API Key 没有访问该模型的权限，或模型名称错误。';
    }
    if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return 'API 调用次数超限 (429)。请稍后再试，或检查您的配额。';
    }
    if (status >= 500) {
      return 'AI 服务暂时不可用 (500)。请稍后重试。';
    }
    if (msg.includes('fetch failed')) {
      return '网络连接失败。请检查您的网络设置、代理配置或 Base URL。';
    }
    return `操作失败: ${msg || '未知错误'}`;
  };

  // Helper to call Gemini API via fetch (bypassing SDK)
  const callGeminiAPI = async (
    model: string, 
    payload: any, 
    customKey?: string, 
    customUrl?: string,
    forceVersion?: string // Add optional version override
  ) => {
    const apiKey = customKey || process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    console.log(`[Fetch API] API Key present: ${!!apiKey}, Custom Key: ${!!customKey}, Env Key: ${!!process.env.API_KEY}, Public Key: ${!!process.env.NEXT_PUBLIC_GEMINI_API_KEY}`);
    if (!apiKey) throw new Error("未找到 API Key");

    let baseUrl = customUrl || 'https://generativelanguage.googleapis.com';
    baseUrl = baseUrl.trim().replace(/\/+$/, ''); // Remove trailing slashes

    // Construct URL
    let version = '';
    
    // 1. Check if the Base URL is the official Google API
    const isOfficial = baseUrl.includes('googleapis.com');

    // 2. Determine default version strategy
    if (forceVersion) {
        version = forceVersion;
    } else if (isOfficial) {
        // Official API defaults to v1beta for newest features
        version = 'v1beta';
    } else {
        // Custom/Proxy APIs usually prefer v1 (OpenAI-compatible style or standard proxy)
        version = 'v1';
    }

    // 3. Override: If custom URL ALREADY contains a version (v1, v1beta, v2, etc.) at the end
    //    Then do not append any version. Trust the user's URL.
    if (baseUrl.match(/\/v1(beta)?$/) || baseUrl.match(/\/v\d+$/)) {
        version = ''; 
    }

    // Construct the final endpoint
    // Format: {baseUrl}/{version}/models/{model}:generateContent
    // Note: We handle the slash logic carefully
    let endpoint = baseUrl;
    if (version) {
        endpoint = `${endpoint}/${version}`;
    }
    endpoint = `${endpoint}/models/${model}:generateContent`;
    
    // Clean up any accidental double slashes (except http://)
    endpoint = endpoint.replace(/([^:]\/)\/+/g, "$1");

    console.log(`[Fetch API] Requesting: ${endpoint}`);
    console.log(`[Fetch API] Model: ${model}`);

    let response;
    
    // If using a custom URL (proxy/transfer station), route through our own Next.js API proxy
    // to avoid CORS issues (Failed to fetch).
    if (customUrl) {
        try {
            response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    endpoint,
                    apiKey,
                    payload
                })
            });
        } catch (netErr) {
            console.error("[Fetch API] Proxy Network Error:", netErr);
            throw new Error("连接代理服务器失败，请检查网络。");
        }
    } else {
        // Direct fetch for official Google API (usually supports CORS)
        try {
            response = await fetch(`${endpoint}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
        } catch (netErr) {
            console.error("[Fetch API] Direct Network Error:", netErr);
            throw new Error("连接 Google API 失败 (Failed to fetch)。如果您使用了 VPN，请确保它支持 UDP/WebSockets 或尝试切换节点。如果您使用了中转站，请尝试配置自定义 Base URL。");
        }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Fetch API] Error ${response.status}:`, errorText);
      let errorMsg = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        // Handle standard Google API error format
        if (errorJson.error && errorJson.error.message) {
          errorMsg = errorJson.error.message;
        }
        // Handle proxy error format
        if (errorJson.message) {
            errorMsg = errorJson.message;
        }
      } catch (e) {
        // ignore json parse error
      }
      
      // Throw object to preserve status for handling 403/429
      const error = new Error(errorMsg);
      (error as any).status = response.status;
      throw error;
    }

    return await response.json();
  };

  const handleScrape = async () => {
    console.log("handleScrape called");
    setError(null);
    setScrapedData(null);
    setGeneratedResult(null);
    setGeneratedImageUrl(null);

    if (useManualInput) {
      console.log("Using manual input");
      if (!manualContent.trim()) {
        setError('请输入一些内容。');
        return;
      }
      setScrapedData({
        url: '',
        title: '手动输入',
        content: manualContent,
        images: []
      });
    } else {
      console.log("Using URL input:", url);
      if (!url.trim()) {
        setError('请输入有效的小红书链接。');
        return;
      }
      
      setLoadingStep('scraping');
      try {
        console.log("Calling scrapeXhsNote...");
        const data = await scrapeXhsNote(url);
        console.log("scrapeXhsNote result:", data);
        if (data.error) {
          setError(data.error);
          setLoadingStep('idle');
          return;
        }
        setScrapedData(data);
      } catch (err: any) {
        console.error("scrapeXhsNote failed:", err);
        setError(err.message || '抓取链接失败');
      } finally {
        setLoadingStep('idle');
      }
    }
  };

  // Helper for image generation with retry (using fetch)
  const generateImageWithRetry = async (contentParts: any[], retries = 3): Promise<string | null> => {
    // Check if API key is selected for paid models (only if using official key)
    if (!customApiKey) {
        try {
            const win = window as any;
            if (win.aistudio && !await win.aistudio.hasSelectedApiKey()) {
                await win.aistudio.openSelectKey();
            }
        } catch (e) {
            console.warn("API Key selection check failed", e);
        }
    }

    for (let i = 0; i < retries; i++) {
        try {
            const modelToUse = customImageModel || 'gemini-3.1-flash-image-preview';
            console.log(`[Image Gen] Attempt ${i+1}/${retries} using model: ${modelToUse}`);
            
            const payload = {
                contents: [{ parts: contentParts }],
                generationConfig: {
                    // responseMimeType: "image/jpeg", // Removed to fix 400 error: model does not support this param
                    aspectRatio: "3:4", // Force 3:4 for XHS style
                }
            };
            
            const data = await callGeminiAPI(
                modelToUse,
                payload,
                customApiKey,
                customBaseUrl,
                'v1beta' // Force v1beta for image generation models
            );

            console.log("[Image Gen] Raw Response:", JSON.stringify(data, null, 2)); // Log full response for debugging

            const candidates = data.candidates;
            if (candidates && candidates.length > 0) {
                const candidate = candidates[0];
                const content = candidate.content;
                
                // Log finish reason if available
                if (candidate.finishReason) {
                    console.log(`[Image Gen] Finish Reason: ${candidate.finishReason}`);
                }

                if (content && content.parts) {
                    // Strategy 1: Look for inline_data (REST API standard - snake_case)
                    let imagePart = content.parts.find((p: any) => p.inline_data);
                    if (imagePart && imagePart.inline_data) {
                        return `data:${imagePart.inline_data.mime_type};base64,${imagePart.inline_data.data}`;
                    }

                    // Strategy 2: Look for inlineData (SDK standard - camelCase, some proxies convert this)
                    imagePart = content.parts.find((p: any) => p.inlineData);
                    if (imagePart && imagePart.inlineData) {
                         // Note: camelCase usually uses mimeType instead of mime_type
                         const mimeType = imagePart.inlineData.mimeType || imagePart.inlineData.mime_type || "image/jpeg";
                         return `data:${mimeType};base64,${imagePart.inlineData.data}`;
                    }
                    
                    // Strategy 3: Look for text that contains a URL (some proxies return hosted URLs)
                    const textPart = content.parts.find((p: any) => p.text);
                    if (textPart && textPart.text) {
                        const text = textPart.text.trim();
                        console.log("[Image Gen] Text response found:", text);
                        
                        // Check for markdown image ![alt](url)
                        const markdownMatch = text.match(/!\[.*?\]\((.*?)\)/);
                        if (markdownMatch) return markdownMatch[1];
                        
                        // Check for raw URL (http/https)
                        if (text.startsWith('http')) return text;
                    }
                }
                
                // Log the full content if no image found
                console.warn("[Image Gen] No image part found in content:", JSON.stringify(content, null, 2));
            } else {
                console.warn("[Image Gen] No candidates returned:", JSON.stringify(data, null, 2));
            }
            throw new Error("API 返回成功，但在响应中未找到图片数据。请按 F12 查看控制台日志中的 [Image Gen] Raw Response。");
        } catch (error: any) {
            // Handle Rate Limits (429)
            const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED');
            if (isRateLimit && i < retries - 1) {
                const delay = Math.pow(2, i) * 2000;
                console.log(`Rate limit hit, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // Handle Leaked/Invalid Key (403)
            if (error.status === 403 || error.message?.includes('leaked') || error.message?.includes('PERMISSION_DENIED')) {
                console.error("API Key permission denied/leaked:", error);
                throw error; // Stop retrying on 403
            }
            
            console.warn(`Attempt ${i+1} failed:`, error);
            if (i === retries - 1) throw error; // Throw the last error
        }
    }
    return null;
  };

  const handleGenerate = async () => {
    console.log("handleGenerate called");
    if (!scrapedData) {
        console.warn("No scrapedData available");
        return;
    }

    setError(null);
    setGeneratedResult(null);
    setGeneratedImageUrl(null);

    // Check if API key is selected for paid models (needed for gemini-3.1-flash-image-preview)
    // Only check if we are NOT using a custom key
    if (!customApiKey) {
        try {
        const win = window as any;
        if (win.aistudio) {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await win.aistudio.openSelectKey();
            }
        }
        } catch (e) {
        console.warn("API Key selection check failed", e);
        }
    }

    // Generate Text
    setLoadingStep('generating_text');
    setImageError(null); // Clear previous image errors
    try {
      // 1. Generate Text Content
      const contentParts: any[] = [];
      
      // Add up to 3 images for analysis
      if (scrapedData.images && scrapedData.images.length > 0) {
        const imagesToFetch = scrapedData.images.slice(0, 3);
        for (const imgUrl of imagesToFetch) {
            const b64 = await urlToBase64(imgUrl);
            if (b64) {
                // REST API format
                contentParts.push({
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: b64
                    }
                });
            }
        }
      }

      const prompt = `
        你是一个专业的小红书内容创作者。
        你的任务是将以下笔记内容（以及提供的参考图片）重写为一篇新的、吸引人的帖子。
        
        原标题: ${scrapedData.title}
        原内容: ${scrapedData.content}
        
        风格: ${style} (例如：创意、专业、情感、幽默、教育)
        
        要求:
        1. 仔细分析提供的所有参考图片，理解图片想要表达的核心信息、氛围和视觉重点。
        2. 创建一个吸引人的新标题（包含表情符号）。
        3. 使用小红书风格（表情符号、短段落、标签）重写内容，必须使用简体中文。
        4. 生成 5-10 个相关的话题标签。
        5. **制定配图方案**：
           - **智能规划**：如果原图数量较多（超过3张）或内容重复，请不要逐一复刻。请提取所有图片的核心信息点（如步骤、成分、对比、卖点），重新设计 2-4 张高质量的配图方案。
           - **封面图**：第一张图必须是极具吸引力的封面图（包含大标题文字效果、高饱和度、对比度）。
           - **内容图**：后续图片必须是**信息图表 (Infographic)**、**清单 (Checklist)** 或 **极简风格展示图**。
           - **文字要求**：图片中的文字必须是**简体中文**。严禁出现英文（除非是品牌名）。文字要少而精，使用大号字体。
           - **参考原图**：如果新图片需要参考某张原图的构图或内容，请指定 'referenceImageIndex'。如果新图片是综合了多张图的信息或者是全新的设计，则不需要指定 'referenceImageIndex'。
           - **提示词**：为每一张图片编写详细的英文提示词 (prompt)。提示词应包含主体、环境、光影、风格、文字排版（如 "text overlay", "magazine style"）等细节。
           - **中文提示词 (promptZh)**：这是最重要的部分。请用中文详细描述图片内容，特别是**图片上需要出现的文字内容**（例如：“图片中间写着大标题‘超好用’”，“左边列出三个优点...”）。
        
        输出 JSON 格式:
        {
          "title": "新标题",
          "content": "新内容...",
          "tags": ["#标签1", "#标签2"],
          "imagePlan": [
            {
              "prompt": "Detailed English image prompt, emphasizing style and composition...",
              "promptZh": "详细的中文图片提示词，明确指定图片中的中文文字内容...",
              "referenceImageIndex": 0, // Optional
              "reason": "Explanation of why this image is needed"
            }
          ]
        }
      `;
      
      contentParts.push({ text: prompt });

      // REST API Payload Structure
      const payload = {
          contents: [{ parts: contentParts }],
          // Remove responseMimeType: 'application/json' to support models that don't have JSON mode enabled
          generationConfig: {
              // responseMimeType: 'application/json' 
          }
      };

      const data = await callGeminiAPI(
          customModel || 'gemini-3-flash-preview', 
          payload, 
          customApiKey, 
          customBaseUrl
      );

      // Parse Response
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No response text from Gemini');
      
      // Clean up markdown code blocks if present
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      let result: GeneratedResult;
      try {
        result = JSON.parse(text) as GeneratedResult;
      } catch (e) {
        console.error("Failed to parse JSON:", text);
        throw new Error("AI 返回的内容不是有效的 JSON 格式，请重试。");
      }
      
      setGeneratedResult(result);
      
      // Generate Images based on Plan
      if (result.imagePlan && result.imagePlan.length > 0) {
        setLoadingStep('generating_image');
        try {
            const newImageUrls: string[] = [];
            
            for (const plan of result.imagePlan) {
                const imgContentParts: any[] = [];
                
                // Use Chinese prompt as primary, as it contains specific text instructions
                // Append style modifiers to ensure quality and text rendering
                const primaryPrompt = plan.promptZh || plan.prompt;
                const styleModifiers = ", aspect ratio 3:4, vertical format, high quality, 8k resolution, 3D render, minimalist style, text in Simplified Chinese only, no English text";
                const finalPrompt = primaryPrompt + styleModifiers;

                // If a reference image index is provided and valid, fetch it
                if (typeof plan.referenceImageIndex === 'number' && 
                    scrapedData.images && 
                    scrapedData.images[plan.referenceImageIndex]) {
                    
                    const refUrl = scrapedData.images[plan.referenceImageIndex];
                    const refBase64 = await urlToBase64(refUrl);
                    
                    if (refBase64) {
                        imgContentParts.push({
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: refBase64
                            }
                        });
                        // Instruction for Image-to-Image
                        imgContentParts.push({ text: "Use this image as a composition reference. " + finalPrompt });
                    } else {
                        // Fallback if image fetch fails
                        imgContentParts.push({ text: finalPrompt });
                    }
                } else {
                    // Text-to-Image only
                    imgContentParts.push({ text: finalPrompt });
                }

                const imageUrl = await generateImageWithRetry(imgContentParts);
                if (imageUrl) {
                    newImageUrls.push(imageUrl);
                }
                
                // Base delay between successful requests
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            if (newImageUrls.length > 0) {
                setGeneratedImageUrl(newImageUrls[0]); 
                setGeneratedResult(prev => prev ? { ...prev, imageUrls: newImageUrls } : null);
            }
        } catch (imgErr: any) {
            console.error("Image generation process failed", imgErr);
            // Don't overwrite the main result if partial images succeeded, but show a warning if all failed?
            // Or just set the error message.
            setImageError(formatApiError(imgErr));
        }
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(formatApiError(err));
    } finally {
      setLoadingStep('idle');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const handleRegenerateImages = async () => {
    if (!generatedResult?.imagePlan || !scrapedData) return;

    setLoadingStep('generating_image');
    
    // Check if API key is selected for paid models
    if (!customApiKey) {
        try {
        const win = window as any;
        if (win.aistudio && !await win.aistudio.hasSelectedApiKey()) {
            await win.aistudio.openSelectKey();
        }
        } catch (e) {
        console.warn("API Key selection check failed", e);
        }
    }

    try {
        const newImageUrls: string[] = [];

        for (const plan of generatedResult.imagePlan) {
            const imgContentParts: any[] = [];
            
            // Use Chinese prompt if available (edited by user), otherwise fallback to English prompt
            const primaryPrompt = plan.promptZh || plan.prompt;
            const styleModifiers = ", aspect ratio 3:4, vertical format, high quality, 8k resolution, 3D render, minimalist style, text in Simplified Chinese only, no English text";
            const promptText = primaryPrompt + styleModifiers;

            if (typeof plan.referenceImageIndex === 'number' && 
                scrapedData.images && 
                scrapedData.images[plan.referenceImageIndex]) {
                
                const refUrl = scrapedData.images[plan.referenceImageIndex];
                const refBase64 = await urlToBase64(refUrl);
                
                if (refBase64) {
                    imgContentParts.push({
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: refBase64
                        }
                    });
                    imgContentParts.push({ text: "Use this image as a composition reference. " + promptText });
                } else {
                    imgContentParts.push({ text: promptText });
                }
            } else {
                imgContentParts.push({ text: promptText });
            }

            const imageUrl = await generateImageWithRetry(imgContentParts);
            if (imageUrl) {
                newImageUrls.push(imageUrl);
            }

            // Base delay between successful requests
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        if (newImageUrls.length > 0) {
            setGeneratedImageUrl(newImageUrls[0]); 
            setGeneratedResult(prev => prev ? { ...prev, imageUrls: newImageUrls } : null);
        }
    } catch (imgErr) {
        console.error("Image regeneration failed", imgErr);
        setError(formatApiError(imgErr));
    } finally {
        setLoadingStep('idle');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-rose-200 selection:text-rose-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white font-bold">
              X
            </div>
            <h1 className="font-bold text-lg tracking-tight">AI XHS Recreator</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              title="设置"
            >
              <Settings2 size={20} />
            </button>
            <div className="text-xs font-mono text-stone-400">v1.0.0</div>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h3 className="font-bold text-lg">设置</h3>
                <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-stone-600">
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    自定义 API Key (可选)
                  </label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full p-3 pr-10 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    {customApiKey && (
                      <button
                        onClick={() => setCustomApiKey('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                        title="清除"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    如果使用中转站，请在此填入中转站提供的 Key。留空则使用默认 Key。
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    自定义 Base URL (可选)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={customBaseUrl}
                      onChange={(e) => setCustomBaseUrl(e.target.value)}
                      placeholder="https://api.example.com/v1beta"
                      className="w-full p-3 pr-10 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    {customBaseUrl && (
                      <button
                        onClick={() => setCustomBaseUrl('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                        title="清除"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    用于连接中转站 API 地址。<b>如果是 Google 官方 Key，请留空。</b>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    自定义模型名称 (可选)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="gemini-3-flash-preview"
                      className="w-full p-3 pr-10 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    {customModel !== 'gemini-3-flash-preview' && (
                      <button
                        onClick={() => setCustomModel('gemini-3-flash-preview')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                        title="恢复默认"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    如果中转站不支持 gemini-3-flash-preview，可尝试 gemini-1.5-flash 或 gemini-pro。
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    自定义绘图模型 (可选)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={customImageModel}
                      onChange={(e) => setCustomImageModel(e.target.value)}
                      placeholder="gemini-3.1-flash-image-preview"
                      className="w-full p-3 pr-10 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    {customImageModel !== 'gemini-3.1-flash-image-preview' && (
                      <button
                        onClick={() => setCustomImageModel('gemini-3.1-flash-image-preview')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                        title="恢复默认"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    默认 gemini-3.1-flash-image-preview。也可尝试 gemini-2.5-flash-image。
                  </p>
                </div>
              </div>
              <div className="p-6 bg-stone-50 flex justify-end gap-3">
                <button 
                  onClick={resetSettings}
                  className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mr-auto text-sm"
                >
                  恢复默认 (使用官方 Key)
                </button>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={saveSettings}
                  className="px-4 py-2 bg-rose-500 text-white font-medium rounded-lg hover:bg-rose-600 transition-colors"
                >
                  保存设置
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-stone-900">
            即刻复刻你的 <span className="text-rose-500">小红书</span> 笔记
          </h2>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto">
            粘贴链接，让 AI 重写文案并生成全新配图。
            内容创作者和社媒运营的必备神器。
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex gap-4 mb-4">
            <button 
              onClick={() => setUseManualInput(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!useManualInput ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
            >
              链接抓取
            </button>
            <button 
              onClick={() => setUseManualInput(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${useManualInput ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
            >
              手动输入
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {!useManualInput ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="在此粘贴小红书链接（支持粘贴完整分享文本）..."
                  className="w-full pl-4 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  value={url}
                  onChange={(e) => {
                    const val = e.target.value;
                    const urlMatch = val.match(/(https?:\/\/[^\s]+)/);
                    setUrl(urlMatch ? urlMatch[0] : val);
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <ExternalLink size={18} />
                </div>
              </div>
            ) : (
              <textarea
                placeholder="在此粘贴笔记内容..."
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all min-h-[120px]"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
              />
            )}

            <button
              onClick={handleScrape}
              disabled={loadingStep !== 'idle'}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-rose-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingStep === 'idle' ? (
                <>
                  <RefreshCw size={18} />
                  {useManualInput ? '预览内容' : '抓取笔记'}
                </>
              ) : (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {loadingStep === 'scraping' && '正在抓取内容...'}
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[90] w-full max-w-lg px-4 animate-in slide-in-from-top-5 fade-in duration-300 pointer-events-none">
              <div className="pointer-events-auto bg-white border border-red-100 text-red-700 text-sm rounded-xl shadow-2xl flex flex-col gap-3 p-4 relative">
                <button 
                  onClick={() => setError(null)} 
                  className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-50 rounded-full flex-shrink-0 text-red-500">
                    <AlertCircle size={18} />
                  </div>
                  <div className="space-y-1 pt-1 pr-6">
                      <p className="font-bold text-stone-900">出错了</p>
                      <p className="opacity-90 leading-relaxed text-stone-600">{error}</p>
                  </div>
                </div>
                
                {/* Provide a quick fix button if it's a key issue and user has a custom key set */}
                {(error.includes('403') || error.includes('封禁') || error.includes('Leaked') || error.includes('权限')) && customApiKey && (
                    <div className="pl-[52px]">
                        <button
                          onClick={() => {
                              resetSettings();
                              setError(null);
                          }}
                          className="px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-all shadow-sm flex items-center gap-2"
                        >
                          <RefreshCw size={12} />
                          停止使用当前 Key (恢复默认)
                        </button>
                        <p className="text-xs text-stone-400 mt-2">
                          点击上方按钮将清除您设置的自定义 Key，并尝试使用系统默认 Key。
                        </p>
                    </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {scrapedData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Original Content Card */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                        原始笔记
                    </h3>
                    <div className="flex gap-2 items-center">
                        <div className="px-2 py-1 bg-stone-100 rounded text-xs text-stone-400 font-mono">
                            {scrapedData.images?.length || 0} 图
                        </div>
                        {/* Settings Controls moved here for better alignment */}
                        <div className="flex gap-1">
                            <select
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="px-2 py-1 bg-white border border-stone-200 rounded text-xs focus:outline-none cursor-pointer"
                                title="风格选择"
                            >
                                <option value="creative">✨ 创意</option>
                                <option value="professional">💼 专业</option>
                                <option value="emotional">🥺 情感</option>
                                <option value="humorous">😂 幽默</option>
                                <option value="educational">📚 干货</option>
                            </select>
                            <button
                                onClick={handleGenerate}
                                disabled={loadingStep !== 'idle'}
                                className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium rounded transition-all shadow-sm disabled:opacity-70 flex items-center gap-1"
                            >
                                {loadingStep !== 'idle' && loadingStep !== 'scraping' ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={12} />
                                )}
                                复刻
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Images - Fixed Aspect Ratio Container */}
                <div className="w-full aspect-[3/4] bg-stone-100 relative group border-b border-stone-100">
                    {scrapedData.images && scrapedData.images.length > 0 ? (
                        <div className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory custom-scrollbar">
                            {scrapedData.images.map((img, idx) => (
                                <div key={idx} className="flex-shrink-0 w-full h-full relative snap-center">
                                    <Image 
                                        src={img.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(img)}` : img}
                                        alt={`Original ${idx + 1}`} 
                                        fill 
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-md font-medium">
                                        {idx + 1} / {scrapedData.images.length}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-stone-400">
                            <ImageIcon size={48} className="opacity-20" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                    <h4 className="font-bold text-lg leading-snug text-stone-900">{scrapedData.title || '无标题'}</h4>
                    <div className="prose prose-stone prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-stone-600 leading-relaxed">{scrapedData.content}</p>
                    </div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-50 mt-4">
                        {scrapedData.tags?.map((tag, i) => (
                            <span key={i} className="text-xs text-stone-400">#{tag}</span>
                        ))}
                    </div>
                </div>
              </div>

              {/* Generated Content Card */}
              <div className="bg-white rounded-2xl border border-rose-100 shadow-xl shadow-rose-500/5 overflow-hidden flex flex-col h-full relative">
                <div className="p-4 border-b border-rose-50 flex justify-between items-center bg-rose-50/30">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        AI 复刻版本
                    </h3>
                    <div className="flex gap-2 items-center">
                        <div className="px-2 py-1 bg-rose-100 text-rose-600 rounded text-xs font-medium">
                            📐 3:4
                        </div>
                        <button 
                            onClick={handleRegenerateImages}
                            disabled={loadingStep !== 'idle' || !generatedResult}
                            className="text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                        >
                            <RefreshCw size={12} className={loadingStep === 'generating_image' ? 'animate-spin' : ''} />
                            重绘图片
                        </button>
                    </div>
                </div>
                
                {/* Images - Fixed Aspect Ratio Container (Matches Left) */}
                <div className="w-full aspect-[3/4] bg-stone-50 relative group border-b border-stone-100">
                    {loadingStep === 'generating_image' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-rose-500 bg-white/80 backdrop-blur-sm z-10">
                            <Loader2 size={32} className="animate-spin" />
                            <span className="text-sm font-medium animate-pulse">正在绘制小红书风格图片...</span>
                        </div>
                    ) : null}

                    {generatedResult?.imageUrls && generatedResult.imageUrls.length > 0 ? (
                        <div className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory custom-scrollbar">
                            {generatedResult.imageUrls.map((imgUrl, idx) => (
                                <div key={idx} className="flex-shrink-0 w-full aspect-[3/4] relative snap-center group">
                                    <Image 
                                        src={imgUrl} 
                                        alt={`AI Generated ${idx + 1}`} 
                                        fill 
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-4 opacity-0 group-hover:opacity-100 gap-2">
                                        <a 
                                            href={imgUrl} 
                                            download={`xhs-remix-${idx + 1}.png`}
                                            className="bg-white text-stone-900 p-2 rounded-full shadow-lg hover:scale-105 transition-transform"
                                            title="下载图片"
                                        >
                                            <ImageIcon size={16} />
                                        </a>
                                        <button 
                                            onClick={() => window.open(imgUrl, '_blank')}
                                            className="bg-white text-stone-900 p-2 rounded-full shadow-lg hover:scale-105 transition-transform"
                                            title="在新标签页打开"
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-2 left-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                                        AI 生成 {idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="aspect-[3/4] relative bg-stone-100 flex items-center justify-center">
                            <div className="text-stone-400 flex flex-col items-center gap-2">
                              {loadingStep === 'generating_image' ? (
                                <>
                                    <Loader2 size={32} className="animate-spin text-rose-500" />
                                    <span className="text-sm">正在根据内容生成 AI 配图...</span>
                                </>
                              ) : (
                                <>
                                    <ImageIcon size={32} />
                                    <span className="text-sm">图片生成失败或等待中</span>
                                </>
                              )}
                            </div>
                        </div>
                    )}
                    
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 flex-1 bg-white overflow-y-auto custom-scrollbar max-h-[500px]">
                    {imageError && (
                        <div className="p-3 bg-orange-50 border border-orange-100 text-orange-700 text-sm rounded-lg flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">配图生成失败</p>
                                <p className="opacity-90 text-xs mt-1">{imageError}</p>
                            </div>
                        </div>
                    )}
                    
                    {loadingStep === 'generating_text' ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-6 bg-stone-100 rounded w-3/4"></div>
                            <div className="h-4 bg-stone-100 rounded w-full"></div>
                            <div className="h-4 bg-stone-100 rounded w-5/6"></div>
                            <div className="h-4 bg-stone-100 rounded w-4/6"></div>
                        </div>
                    ) : (generatedResult ? (
                        <>
                            <div className="flex justify-between items-start gap-4">
                                <h4 className="font-bold text-lg leading-snug text-stone-900">{generatedResult.title}</h4>
                                <button 
                                    onClick={() => copyToClipboard(generatedResult.title + '\n\n' + generatedResult.content)}
                                    className="text-stone-400 hover:text-rose-500 transition-colors p-1"
                                    title="复制全文"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                            <div className="prose prose-stone prose-sm max-w-none">
                                <p className="whitespace-pre-wrap text-stone-600 leading-relaxed">{generatedResult.content}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-50 mt-4">
                                {generatedResult.tags?.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-xs font-medium">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            
                            {/* Image Prompts Editor */}
                            {generatedResult.imagePlan && (
                                <div className="border-t border-stone-100 pt-4 mt-4">
                              <details className="group">
                                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-stone-500 hover:text-stone-900 select-none">
                                      <Settings2 size={16} />
                                      <span>调整配图提示词 (Prompts)</span>
                                      <ChevronDown className="group-open:rotate-180 transition-transform duration-200" size={16} />
                                  </summary>
                                  
                                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                      {generatedResult.imagePlan.map((plan, idx) => (
                                          <div key={idx} className="space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                                              <div className="flex items-center justify-between">
                                                  <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-2">
                                                      <span className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px] text-stone-600">{idx + 1}</span>
                                                      图片 {idx + 1}
                                                  </label>
                                                  {typeof plan.referenceImageIndex === 'number' && (
                                                      <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                                          参考原图 #{plan.referenceImageIndex + 1}
                                                      </span>
                                                  )}
                                              </div>
                                              <textarea 
                                                  value={plan.promptZh || plan.prompt}
                                                  onChange={(e) => {
                                                      const newPlan = [...generatedResult.imagePlan];
                                                      newPlan[idx] = { 
                                                          ...newPlan[idx], 
                                                          promptZh: e.target.value,
                                                          // If user edits Chinese, we might want to clear or update English, 
                                                          // but for now we'll just rely on promptZh for regeneration if it exists.
                                                      };
                                                      setGeneratedResult({ ...generatedResult, imagePlan: newPlan });
                                                  }}
                                                  className="w-full p-3 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                                                  rows={3}
                                                  placeholder="输入图片提示词..."
                                              />
                                          </div>
                                      ))}
                                      
                                      <div className="flex justify-end pt-2">
                                          <button 
                                              onClick={handleRegenerateImages}
                                              disabled={loadingStep === 'generating_image'}
                                              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                          >
                                              {loadingStep === 'generating_image' ? (
                                                  <>
                                                      <Loader2 size={16} className="animate-spin" />
                                                      正在生成...
                                                  </>
                                              ) : (
                                                  <>
                                                      <RefreshCw size={16} />
                                                      重新生成图片
                                                  </>
                                              )}
                                          </button>
                                      </div>
                                  </div>
                              </details>
                          </div>
                      )}
                        </>
                    ) : (
                        <div className="text-center text-stone-400 py-8 text-sm flex flex-col items-center justify-center h-full">
                            <Sparkles size={24} className="mb-2 opacity-20" />
                            等待生成内容...
                        </div>
                    ))}
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-stone-200 bg-white py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-700">AI XHS Recreator</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/terms" className="hover:text-rose-500 transition-colors">用户协议</a>
            <a href="/privacy" className="hover:text-rose-500 transition-colors">隐私政策</a>
            <a href="/contact" className="hover:text-rose-500 transition-colors">联系我们</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
