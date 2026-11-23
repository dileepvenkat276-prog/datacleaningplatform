import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Undo2,
  Trash2,
  HelpCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { AssistantMessage } from '../../types/dataset';
import { useData } from '../../context/DataContext';
import { parseAssistantCommand } from '../../utils/assistantParser';

export const AIAssistantView: React.FC = () => {
  const {
    dataset,
    assistantMessages,
    addAssistantMessage,
    executeAssistantProposal,
    canUndo,
    undo,
    qualityReport
  } = useData();

  const [inputPrompt, setInputPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [assistantMessages]);

  const headers = dataset?.headers || [];
  const rowsCount = dataset?.rows.length || 0;

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || !dataset) return;

    // Add user message
    addAssistantMessage({
      sender: 'user',
      text
    });

    if (!textToSend) {
      setInputPrompt('');
    }

    // Parse command
    setTimeout(() => {
      const parsed = parseAssistantCommand(text, headers, rowsCount);

      addAssistantMessage({
        sender: 'assistant',
        text: parsed.messageText,
        actionProposal: parsed.actionProposal
      });
    }, 250);
  };

  const quickPrompts = [
    'Remove duplicate customers',
    'Fill missing ages with the median',
    'Convert all names to title case',
    'Find unusual salary values',
    'Remove empty columns',
    'Standardize all date formats',
    'Find invalid email addresses',
    'Generate a data quality report'
  ];

  if (!dataset) {
    return <div className="p-8 text-center text-slate-500">Please load a dataset to interact with the AI assistant.</div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <span>Intelligent Cleaning Assistant</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Rule-Based NLP
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Type natural requests to clean, impute, validate, or transform. All changes verify confirmation and allow undo.
            </p>
          </div>
        </div>

        {canUndo && (
          <button
            onClick={undo}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo Last Action</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 shadow-inner">
        {assistantMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
          >
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 px-1">
              <span className="font-semibold capitalize">{msg.sender}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : msg.sender === 'system'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Action Proposal Card */}
              {msg.actionProposal && (
                <div className="mt-3 p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-800 dark:text-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{msg.actionProposal.actionName}</span>
                    </span>

                    {msg.actionProposal.isDestructive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Requires Confirmation</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {msg.actionProposal.description}
                  </p>

                  <div className="pt-1 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => executeAssistantProposal(msg.actionProposal)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all flex items-center space-x-1.5 ${
                        msg.actionProposal.isDestructive
                          ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                          : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                      }`}
                    >
                      <span>Execute Operation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-1 flex-shrink-0">
        <span className="text-[10px] font-bold uppercase text-slate-400 whitespace-nowrap mr-1">Suggestions:</span>
        {quickPrompts.map(prompt => (
          <button
            key={prompt}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500 text-[11px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shadow-xs transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex-shrink-0"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={e => setInputPrompt(e.target.value)}
          placeholder="Ask assistant to clean, impute, title-case, detect outliers, calculate columns..."
          className="flex-1 px-3 py-2 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim()}
          className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white shadow-md shadow-brand-500/20 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
