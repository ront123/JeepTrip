import { memo, useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../lib/chat';

interface DashChatProps {
  tripId: string | undefined;
  userId: string;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isRTL: boolean;
  t: (key: any) => string;
  trip: any;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  sendMessage: (tripId: string, content: string, mediaUrl: string | null, mediaType: 'image' | 'video' | null) => Promise<ChatMessage>;
  uploadMediaFile: (file: File) => Promise<string>;
}

export const DashChat = memo(({
  tripId,
  userId,
  messages,
  setMessages,
  isRTL,
  t,
  trip,
  uploading,
  setUploading,
  sendMessage,
  uploadMediaFile
}: DashChatProps) => {
  const [newMsg, setNewMsg] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rtl = isRTL ? 'rtl' : '';

  const scrollToBottom = (instant = false) => {
    chatEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  };

  // Scroll on messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSendMsgLocal = async () => {
    if (!newMsg.trim() || !tripId) return;
    const msgText = newMsg.trim();
    const tempId = Date.now().toString();

    // 1. Optimistic Update
    const optimisticMsg: ChatMessage = {
      id: tempId,
      trip_id: tripId,
      sender_id: userId,
      content: msgText,
      media_url: null,
      media_type: null,
      image_url: null,
      created_at: new Date().toISOString(),
      users: { full_name: t('you' as any) || 'You' }
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMsg('');

    try {
      const sentMsg = await sendMessage(tripId, msgText, null, null);
      // 2. Replace optimistic message with real message
      setMessages(prev => {
        const alreadyExists = prev.some(m => m.id === sentMsg.id);
        if (alreadyExists) {
          return prev.filter(m => m.id !== tempId);
        }
        return prev.map(m => m.id === tempId ? sentMsg : m);
      });
    } catch (err: any) {
      console.error(err);
      alert(isRTL ? 'שגיאה בשליחה. נסה שוב.' : 'Error sending message. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMsg(msgText);
    }
  };

  const handleFileUploadLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tripId) return;
    const type = file.type.startsWith('video') ? 'video' : 'image';
    try {
      setUploading(true);
      const url = await uploadMediaFile(file);
      await sendMessage(tripId, '', url, type);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="chat-screen">
      <div className="chat-messages">
        {messages.map(msg => {
          const isMe = msg.sender_id === userId || (msg as any).user_id === userId;
          const mediaUrl = msg.media_url || msg.image_url;
          const isVideo = msg.media_type === 'video';
          return (
            <div key={msg.id} className={`msg-wrapper ${isMe ? 'me' : 'other'}`}>
              {!isMe && <p className="msg-author">{msg.users?.full_name}</p>}
              <div className={`msg-bubble ${isMe ? 'me' : 'other'}`}>
                {mediaUrl && (
                  isVideo
                    ? <video src={mediaUrl} controls onLoadedData={() => scrollToBottom()} style={{ width: 200, borderRadius: 8, display: 'block', marginBottom: msg.content ? 8 : 0 }} />
                    : <img src={mediaUrl} alt="media" onLoad={() => scrollToBottom()} style={{ width: 200, borderRadius: 8, display: 'block', marginBottom: msg.content ? 8 : 0 }} />
                )}
                {msg.content && <p className="msg-text">{msg.content}</p>}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {!trip.is_archived && (
        <div className={`chat-input-row ${rtl}`}>
          <input
            className={`input ${rtl}`}
            style={{ flex: 1 }}
            placeholder={t('chat_placeholder')}
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMsgLocal()}
          />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUploadLocal} />
          <button className="send-btn" style={{ fontSize: 16 }} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Upload media">
            {uploading ? <span className="spinner spinner-sm" /> : '📎'}
          </button>
          <button className="send-btn" onClick={handleSendMsgLocal} disabled={!newMsg.trim()}>➤</button>
        </div>
      )}
    </div>
  );
});
