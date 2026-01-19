'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';

interface AiCfoChatProps {
    dataContext: any;
}

export function AiCfoChat({ dataContext }: AiCfoChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [input, setInput] = useState('');
    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/chat',
            body: {
                dataContext,
            },
        }),
        messages: [
            {
                id: 'welcome',
                role: 'assistant',
                parts: [{ type: 'text', text: '您好！我是您的 AI 財務顧問。我已經分析了當前的營運數據，有什麼我可以幫您的嗎？您可以詢問營收趨勢、目標達成率或是轉化策略建議。' }],
            },
        ],
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage({ text: input });
        setInput('');
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 z-[60] group"
            >
                <div className="absolute -top-12 right-0 bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-blue-100">
                    諮詢 AI 財務顧問
                </div>
                <MessageCircle className="w-7 h-7" />
            </button>
        );
    }

    return (
        <div
            className={`fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl flex flex-col z-[60] border border-slate-200 transition-all overflow-hidden ${isMinimized ? 'h-16' : 'h-[500px]'
                }`}
        >
            {/* Header */}
            <div className="bg-blue-600 p-4 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">AI 財務顧問</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                            <span className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">Online | Analytics Active</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                        {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
                    >
                        {messages.map((m: any) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-white border border-slate-200 text-slate-600 shadow-sm'
                                        }`}>
                                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm ${m.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-tl-none prose prose-sm max-w-none'
                                        }`}>
                                        {m.parts.map((part: any, i: number) => {
                                            if (part.type === 'text') return <div key={i}>{part.text}</div>;
                                            return null;
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-2 max-w-[85%]">
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm flex items-center justify-center">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form
                        onSubmit={handleSubmit}
                        className="p-4 border-t border-slate-200 bg-white"
                    >
                        <div className="relative">
                            <input
                                value={input}
                                onChange={handleInputChange}
                                placeholder="詢問關於財務、人次或是建議..."
                                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-300 hover:bg-blue-700 transition-all transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="mt-2 text-[10px] text-center text-slate-400">
                            AI 可能會產生錯誤，請核對重要財務數據。
                        </p>
                    </form>
                </>
            )}
        </div>
    );
}
