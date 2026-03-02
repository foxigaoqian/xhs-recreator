import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-rose-200 selection:text-rose-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">返回首页</span>
          </Link>
          <h1 className="font-bold text-lg tracking-tight">用户协议</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-8">
          <div className="flex items-center gap-3 text-rose-500 mb-6">
            <FileText size={32} />
            <h2 className="text-2xl font-bold text-stone-900">用户服务协议</h2>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">1. 服务说明</h3>
            <p className="text-stone-600 leading-relaxed">
              AI XHS Recreator（以下简称“本服务”）是一款基于人工智能技术的内容辅助创作工具。
              用户可以通过输入链接或文本，利用本服务生成参考文案及配图方案。
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">2. 用户行为规范</h3>
            <p className="text-stone-600 leading-relaxed">
              用户在使用本服务时，必须遵守中华人民共和国相关法律法规。
              用户不得利用本服务制作、复制、发布、传播含有下列内容的信息：
            </p>
            <ul className="list-disc list-inside text-stone-600 space-y-1 pl-4">
              <li>反对宪法所确定的基本原则的；</li>
              <li>危害国家安全，泄露国家秘密，颠覆国家政权，破坏国家统一的；</li>
              <li>损害国家荣誉和利益的；</li>
              <li>煽动民族仇恨、民族歧视，破坏民族团结的；</li>
              <li>散布谣言，扰乱社会秩序，破坏社会稳定的；</li>
              <li>散布淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的；</li>
              <li>侮辱或者诽谤他人，侵害他人合法权益的；</li>
              <li>含有法律、行政法规禁止的其他内容的。</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">3. 知识产权声明</h3>
            <p className="text-stone-600 leading-relaxed">
              本服务生成的图片及文本内容的知识产权归属于生成者（即用户），但用户需自行承担使用生成内容所产生的法律责任。
              用户在使用本服务抓取第三方平台（如小红书）内容时，应确保拥有相应的授权或符合合理使用的法律规定。
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-stone-900">4. 免责声明</h3>
            <p className="text-stone-600 leading-relaxed">
              鉴于人工智能技术的局限性，本服务不保证生成内容的准确性、完整性或适用性。
              用户应自行甄别生成内容，并在使用前进行必要的人工审核。
              因使用本服务生成内容而导致的任何直接或间接损失，本平台不承担责任。
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
