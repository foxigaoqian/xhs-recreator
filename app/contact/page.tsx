import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Github } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-rose-200 selection:text-rose-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">返回首页</span>
          </Link>
          <h1 className="font-bold text-lg tracking-tight">联系我们</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-8">
          <div className="flex items-center gap-3 text-rose-500 mb-6">
            <MessageSquare size={32} />
            <h2 className="text-2xl font-bold text-stone-900">联系方式</h2>
          </div>

          <p className="text-stone-600 leading-relaxed text-lg">
            如果您在使用过程中遇到问题，或者有任何建议和反馈，欢迎通过以下方式联系我们。
            我们非常重视您的意见，并将尽快回复。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-stone-50 p-6 rounded-xl border border-stone-100 hover:border-rose-200 transition-colors group">
              <div className="flex items-center gap-3 mb-4 text-stone-900">
                <div className="p-2 bg-white rounded-lg shadow-sm text-rose-500 group-hover:text-rose-600">
                  <Mail size={24} />
                </div>
                <h3 className="font-bold text-lg">电子邮件</h3>
              </div>
              <p className="text-stone-500 text-sm mb-2">商务合作与技术支持</p>
              <a href="mailto:1054935976@qq.com" className="text-rose-500 font-medium hover:underline text-lg">
                1054935976@qq.com
              </a>
            </div>

            <div className="bg-stone-50 p-6 rounded-xl border border-stone-100 hover:border-rose-200 transition-colors group">
              <div className="flex items-center gap-3 mb-4 text-stone-900">
                <div className="p-2 bg-white rounded-lg shadow-sm text-rose-500 group-hover:text-rose-600">
                  <MessageSquare size={24} />
                </div>
                <h3 className="font-bold text-lg">微信公众号</h3>
              </div>
              <p className="text-stone-500 text-sm mb-4">关注我们获取最新动态</p>
              <div className="w-32 h-32 bg-stone-200 rounded-lg flex items-center justify-center text-stone-400 text-xs border border-dashed border-stone-300">
                [公众号二维码]
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-stone-100 mt-8">
            <h3 className="font-bold text-stone-900 mb-4">常见问题 (FAQ)</h3>
            <div className="space-y-4">
              <details className="group bg-stone-50 rounded-lg p-4 cursor-pointer">
                <summary className="font-medium text-stone-800 flex justify-between items-center list-none">
                  <span>如何获取 API Key？</span>
                  <span className="transition group-open:rotate-180">▼</span>
                </summary>
                <p className="text-stone-600 mt-2 text-sm leading-relaxed">
                  您可以访问 Google AI Studio (aistudio.google.com) 获取免费的 Gemini API Key。
                  如果使用中转服务，请联系您的服务提供商获取 Key。
                </p>
              </details>
              <details className="group bg-stone-50 rounded-lg p-4 cursor-pointer">
                <summary className="font-medium text-stone-800 flex justify-between items-center list-none">
                  <span>生成的图片可以商用吗？</span>
                  <span className="transition group-open:rotate-180">▼</span>
                </summary>
                <p className="text-stone-600 mt-2 text-sm leading-relaxed">
                  生成的图片版权归属于生成者（即您），但需遵守 Google Gemini API 的使用条款。
                  建议在使用前仔细阅读相关法律条款。
                </p>
              </details>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
