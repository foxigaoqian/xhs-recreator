import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-rose-200 selection:text-rose-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">返回首页</span>
          </Link>
          <h1 className="font-bold text-lg tracking-tight">隐私政策</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-8">
          <div className="flex items-center gap-3 text-rose-500 mb-6">
            <ShieldCheck size={32} />
            <h2 className="text-2xl font-bold text-stone-900">隐私保护声明</h2>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">1. 信息收集</h3>
            <p className="text-stone-600 leading-relaxed">
              我们非常重视您的隐私。在使用 AI XHS Recreator 服务时，我们仅收集必要的信息以提供服务：
            </p>
            <ul className="list-disc list-inside text-stone-600 space-y-1 pl-4">
              <li>您输入的链接或文本内容（用于生成 AI 创作）；</li>
              <li>您设置的自定义 API Key（仅存储在您的本地浏览器缓存 LocalStorage 中，不会上传至我们的服务器）；</li>
              <li>您的 IP 地址及浏览器信息（用于基本的访问统计和安全防护）。</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">2. 信息使用</h3>
            <p className="text-stone-600 leading-relaxed">
              我们收集的信息仅用于以下目的：
            </p>
            <ul className="list-disc list-inside text-stone-600 space-y-1 pl-4">
              <li>提供 AI 内容生成服务；</li>
              <li>改善用户体验和产品功能；</li>
              <li>防止滥用和保障服务安全。</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">3. 第三方服务</h3>
            <p className="text-stone-600 leading-relaxed">
              本服务使用 Google Gemini API 进行内容生成。
              当您使用本服务时，您的输入内容将被发送至 Google 的服务器进行处理。
              Google 的隐私政策适用于其对数据的处理方式。
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">4. 数据安全</h3>
            <p className="text-stone-600 leading-relaxed">
              我们采取合理的技术手段保护您的数据安全。
              特别是对于您的 API Key，我们采用本地存储的方式，确保除了您本人及必要的 API 调用过程外，任何第三方无法获取。
            </p>
          </section>

          <div className="pt-8 border-t border-stone-100 text-center">
            <p className="text-sm text-stone-400">
              生效日期：2026年3月
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
