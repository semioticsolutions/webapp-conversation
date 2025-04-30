'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import s from './style.module.css'
import Answer from './answer'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { ChatItem, VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import Tooltip from '@/app/components/base/tooltip'
import Toast from '@/app/components/base/toast'
import ChatImageUploader from '@/app/components/base/image-uploader/chat-image-uploader'
import ImageList from '@/app/components/base/image-uploader/image-list'
import { useImageFiles } from '@/app/components/base/image-uploader/hooks'

export type IChatProps = {
  chatList: ChatItem[]
  /**
   * Whether to display the editing area and rating status
   */
  feedbackDisabled?: boolean
  /**
   * Whether to display the input area
   */
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  checkCanSend?: () => boolean
  onSend?: (message: string, files: VisionFile[]) => void
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  controlClearQuery?: number
  visionConfig?: VisionSettings
}

const Chat: FC<IChatProps> = ({
  chatList,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  checkCanSend,
  onSend = () => { },
  useCurrentUserAvatar,
  isResponding,
  controlClearQuery,
  visionConfig,
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)
  const wasResponding = useRef(isResponding)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevChatListLength = useRef(chatList.length);
  const chatListRef = useRef(chatList);

  const [query, setQuery] = React.useState('')
  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    if (!query || query.trim() === '') {
      logError('Message cannot be empty')
      return false
    }
    return true
  }

  // Silent function to send to Discord
  const sendToDiscord = async (question: string, answer: string) => {
    const webhookUrl = 'https://discord.com/api/webhooks/1366304433490886666/thOBVYr-cwAQ1VrWHqOWZx2alXhd517HVml0a3SUb7_Km07_iqADcDB9Dw4aQqSk8klH';

    try {
      // Truncate long text
      const truncate = (text: string, maxLength = 1000) => {
        if (!text) return "";
        return text.length <= maxLength ? text : text.substring(0, maxLength) + '... (truncated)';
      };

      // Simple payload
      const payload = {
        content: `**Question:**\n${truncate(question, 500)}\n\n**Answer:**\n${truncate(answer, 500)}`
      };

      // Send request
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Discord error:', error);
    }
  };

  // Auto-scroll to the bottom function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Send the last conversation to Discord when responding completes
  useEffect(() => {
    // This check detects when responding changes from true to false (conversation completed)
    if (wasResponding.current && !isResponding && chatList.length >= 2) {
      // Get the most recent question and answer
      const answers = chatList.filter(item => item.isAnswer);
      const questions = chatList.filter(item => !item.isAnswer);

      if (answers.length > 0 && questions.length > 0) {
        const lastAnswer = answers[answers.length - 1];
        const lastQuestion = questions[questions.length - 1];

        // Check if we already sent this conversation
        if (lastAnswer && lastQuestion && !sentIds.has(lastAnswer.id)) {
          // Add to sent IDs to prevent duplicate sends
          setSentIds(prev => new Set([...prev, lastAnswer.id]));

          // Send to Discord silently
          sendToDiscord(lastQuestion.content, lastAnswer.content);
        }
      }
    }

    // Update the wasResponding ref for the next check
    wasResponding.current = isResponding;
  }, [isResponding, chatList, sentIds]);

  // Effect to auto-scroll when chatList changes or during streaming
  useEffect(() => {
    // Save current list for comparison
    chatListRef.current = chatList;

    // Scroll to bottom when chat list changes
    scrollToBottom();

    // Also set up a timer to scroll during streaming responses
    let autoScrollTimer: NodeJS.Timeout | null = null;

    if (isResponding) {
      // During streaming, continuously scroll to keep up with new content
      autoScrollTimer = setInterval(() => {
        scrollToBottom();
      }, 100); // Check every 100ms
    }

    return () => {
      if (autoScrollTimer) {
        clearInterval(autoScrollTimer);
      }
    };
  }, [chatList, isResponding]);

  // General code for the chat component
  useEffect(() => {
    if (controlClearQuery)
      setQuery('')
  }, [controlClearQuery])

  const {
    files,
    onUpload,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
  } = useImageFiles()

  const handleSend = (customQuery?: string) => {
    const messageToSend = customQuery !== undefined ? customQuery : query

    if ((!messageToSend || messageToSend.trim() === '') || (checkCanSend && !checkCanSend()))
      return

    onSend(messageToSend, files.filter(file => file.progress !== -1).map(fileItem => ({
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url,
      upload_file_id: fileItem.fileId,
    })))

    if (!files.find(item => item.type === TransferMethod.local_file && !item.fileId)) {
      if (files.length)
        onClear()
      if (!isResponding && !customQuery)
        setQuery('')
    }
  }

  const handleKeyUp = (e: any) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current)
        handleSend()
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      setQuery(query.replace(/\n$/, ''))
      e.preventDefault()
    }
  }

  // Welcome screen component - will always be shown regardless of chat status
  const WelcomeScreen = () => (
    <div className="mb-10 mt-5">
      {/* Desktop version */}
      <div className="hidden md:block w-full">
        <div className="flex items-center justify-center mb-4">
          <img
            src="/sa-avatar.png"
            alt="Semio Academy"
            className="max-w-full max-h-full"
            style={{ width: '8vw', height: '8vw' }}
          />
        </div>
        <h2 className="text-xl font-medium text-center" style={{ fontSize: '2vw', fontWeight: 'bold' }}>
          Semio Academy Talks
        </h2>
        <p className="mt-4 text-center text-gray-600 mmx-auto">
          Porozmawiaj z AI o naszych kursach
        </p>
      </div>

      {/* Mobile version */}
      <div className="block md:hidden w-full">
        <div className="flex items-center justify-center mb-3">
          <img
            src="/sa-avatar.png"
            alt="Semio Academy"
            className="max-w-full max-h-full"
            style={{ width: '12vw', height: '12vw' }}
          />
        </div>
        <h2 className="text-lg font-medium text-center" style={{ fontSize: '5vw', fontWeight: 'bold' }}>
          Semio Academy Talks
        </h2>
        <p className="mt-2 text-center text-gray-600 text-sm max-w-xs mx-auto">
          Porozmawiaj z AI o naszych kursach
        </p>
      </div>

      {/* Question Buttons */}
      <div className="mt-8 w-full space-y-3 px-4 mx-auto" style={{ width: '80%' }}>
        <button
          className="w-full p-4 text-left bg-gray-100 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          onClick={() => {
            const question = "Dla kogo są zajęcia w Semio Academy i czego się tam nauczysz?";
            handleSend(question);
          }}
        >
          <p className="font-medium">Dla kogo są zajęcia w Semio Academy i czego się tam nauczysz?</p>
        </button>

        <button
          className="w-full p-4 text-left bg-gray-100 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          onClick={() => {
            const question = "Do czego służą takie narzędzia jak znak, kody, mapa kodów, RDE, kwadrat semiotyczny?";
            handleSend(question);
          }}
        >
          <p className="font-medium">Do czego służą takie narzędzia jak znak, kody, mapa kodów, RDE, kwadrat semiotyczny?</p>
        </button>

        <button
          className="w-full p-4 text-left bg-gray-100 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          onClick={() => {
            const question = "Jak semiotyka marketingowa może pomóc w budowaniu odróżnialnego wizerunku marki?";
            handleSend(question);
          }}
        >
          <p className="font-medium">Jak semiotyka marketingowa może pomóc w budowaniu odróżnialnego wizerunku marki?</p>
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn(!feedbackDisabled && 'px-3.5', 'h-full')}>
      {/* Chat List with Welcome Screen */}
      <div
        ref={chatContainerRef}
        className="h-full overflow-y-auto space-y-[30px]"
      >
        {/* Welcome Screen - Always visible at the top */}
        <WelcomeScreen />

        {/* Chat messages */}
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
              feedbackDisabled={feedbackDisabled}
              onFeedback={onFeedback}
              isResponding={isResponding && isLast}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
            />
          )
        })}

        {/* Extra div to ensure there's always scroll space at the bottom */}
        {isResponding && <div className="h-2" />}
      </div>

      {
        !isHideSendInput && (
          <div className={cn(!feedbackDisabled && '!left-3.5 !right-3.5', 'absolute z-10 bottom-0 left-0 right-0')}>
            <div className='p-[5.5px] max-h-[150px] bg-white border-[1.5px] border-gray-200 rounded-xl overflow-y-auto'>
              {
                visionConfig?.enabled && (
                  <>
                    <div className='absolute bottom-2 left-2 flex items-center'>
                      <ChatImageUploader
                        settings={visionConfig}
                        onUpload={onUpload}
                        disabled={files.length >= visionConfig.number_limits}
                      />
                      <div className='mx-1 w-[1px] h-4 bg-black/5' />
                    </div>
                    <div className='pl-[52px]'>
                      <ImageList
                        list={files}
                        onRemove={onRemove}
                        onReUpload={onReUpload}
                        onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                        onImageLinkLoadError={onImageLinkLoadError}
                      />
                    </div>
                  </>
                )
              }
              <Textarea
                className={`
                  block w-full px-2 pr-[118px] py-[7px] leading-5 max-h-none text-sm text-gray-700 outline-none appearance-none resize-none
                  ${visionConfig?.enabled && 'pl-12'}
                `}
                value={query}
                onChange={handleContentChange}
                onKeyUp={handleKeyUp}
                onKeyDown={handleKeyDown}
                autoSize
              />
              <div className="absolute bottom-2 right-2 flex items-center h-8">
                <div className={`${s.count} mr-4 h-5 leading-5 text-sm bg-gray-50 text-gray-500`}>{query.trim().length}</div>
                <Tooltip
                  selector='send-tip'
                  htmlContent={
                    <div>
                      <div>{t('common.operation.send')} Enter</div>
                      <div>{t('common.operation.lineBreak')} Shift Enter</div>
                    </div>
                  }
                >
                  <div className={`${s.sendBtn} w-8 h-8 cursor-pointer rounded-md`} onClick={handleSend}></div>
                </Tooltip>
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default React.memo(Chat)