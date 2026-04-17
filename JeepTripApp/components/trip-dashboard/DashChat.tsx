import React, { memo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Image,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { ChatMessage } from '@/lib/chat';

interface DashChatProps {
  tripId: string;
  userId: string;
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  isRTL: boolean;
  t: (key: any) => string;
  trip: any;
  handleSendMessage: (content: string) => Promise<void>;
  handlePickMedia: (type: 'image' | 'video') => Promise<void>;
  handleDownloadMedia: (url: string) => void;
}

const VideoMessage = memo(({ url, style }: { url: string; style: any }) => {
  const player = useVideoPlayer(url, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <VideoView 
      style={style} 
      player={player} 
      allowsFullscreen 
      allowsPictureInPicture 
      contentFit="cover"
    />
  );
});

const ChatMessageItem = memo(({ item, userId, isRTL, handleDownloadMedia, onMediaLoad }: any) => {
  const isMe = item.user_id === userId || item.sender_id === userId;
  const mediaUrl = item.media_url || item.image_url;
  const isVideo = item.media_type === 'video';
  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };

  return (
    <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : styles.msgWrapperOther]}>
      {!isMe && <Text style={[styles.msgAuthor, rtlText]}>{item.users?.full_name}</Text>}
      <TouchableOpacity 
        activeOpacity={0.9}
        onLongPress={() => mediaUrl && handleDownloadMedia(mediaUrl)}
        style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}
      >
        {mediaUrl ? (
          isVideo ? (
            <VideoMessage
              url={mediaUrl}
              style={{ width: 240, height: 240, borderRadius: 8, marginBottom: item.content ? 8 : 0 }}
            />
          ) : (
            <Image 
              source={{ uri: mediaUrl }} 
              style={{ width: 220, height: 220, borderRadius: 8, marginBottom: item.content ? 8 : 0 }} 
              resizeMode="cover" 
              onLoad={onMediaLoad}
            />
          )
        ) : null}
        {item.content ? <Text style={[styles.msgText, rtlText]}>{item.content}</Text> : null}
      </TouchableOpacity>
    </View>
  );
}, (prev, next) => prev.item.id === next.item.id);

export const DashChat = memo(({
  tripId,
  userId,
  messages,
  isRTL,
  t,
  trip,
  handleSendMessage,
  handlePickMedia,
  handleDownloadMedia,
}: DashChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const chatScrollRef = useRef<FlatList>(null);

  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  const scrollToBottom = (animated = true) => {
    if (messages.length > 0) {
      chatScrollRef.current?.scrollToEnd({ animated });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
      const timer = setTimeout(() => scrollToBottom(true), 150);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const onSend = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    await handleSendMessage(text);
  };

  const onPickMedia = async (type: 'image' | 'video') => {
    setUploadingImage(true);
    try {
      await handlePickMedia(type);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={chatScrollRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => (
          <ChatMessageItem 
            item={item} 
            userId={userId} 
            isRTL={isRTL} 
            handleDownloadMedia={handleDownloadMedia} 
            onMediaLoad={() => scrollToBottom(true)}
          />
        )}
        contentContainerStyle={styles.chatList}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        onContentSizeChange={() => scrollToBottom(true)}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
      />
      {!trip?.is_archived ? (
        <View style={[styles.inputRow, rowStyle]}>
          <TouchableOpacity style={{ padding: 5 }} onPress={() => onPickMedia('image')} disabled={uploadingImage}>
            <Text style={{ fontSize: 24, opacity: uploadingImage ? 0.5 : 1 }}>🖼️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 5 }} onPress={() => onPickMedia('video')} disabled={uploadingImage}>
            <Text style={{ fontSize: 24, opacity: uploadingImage ? 0.5 : 1 }}>📹</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, rtlText, { minHeight: 48, paddingTop: 12, paddingBottom: 12 }]}
            placeholder={t('chat_placeholder')}
            placeholderTextColor={Palette.mud}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
            <Text style={{ color: Palette.charcoal, fontWeight: '800' }}>➤</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.readOnlyChat}>
          <Text style={styles.readOnlyText}>{isRTL ? 'הצאט נעול לקריאה בלבד' : 'Chat is locked (read-only)'}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  inputRow: { backgroundColor: Palette.charcoalMid, padding: 10, borderTopWidth: 1, borderTopColor: Palette.charcoalLight, gap: 10, alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: Palette.charcoal, color: Palette.cream, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.charcoalLight },
  sendBtn: { backgroundColor: Palette.gold, width: 45, height: 45, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  chatList: { padding: Spacing.md, paddingBottom: 20 },
  msgWrapper: { marginBottom: 15, maxWidth: '80%' },
  msgWrapperMe: { alignSelf: 'flex-end' },
  msgWrapperOther: { alignSelf: 'flex-start' },
  msgAuthor: { color: Palette.gold, fontSize: 10, marginBottom: 4, fontWeight: '700' },
  msgBubble: { padding: 12, borderRadius: Radius.lg },
  msgBubbleMe: { backgroundColor: Palette.olive, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: Palette.charcoalMid, borderWidth: 1, borderColor: Palette.charcoalLight, borderBottomLeftRadius: 4 },
  msgText: { color: Palette.cream, fontSize: Typography.sm },
  readOnlyChat: { padding: 20, backgroundColor: Palette.charcoalMid, alignItems: 'center', borderTopWidth: 1, borderTopColor: Palette.charcoalLight },
  readOnlyText: { color: Palette.sand, fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
});
