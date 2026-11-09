import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Avatar,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Tooltip,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ImageIcon from '@mui/icons-material/Image';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import api, { getFileUrl } from '../services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrls?: string[];
  suggestedActions?: string[];
  timestamp: string;
}

interface Attachment {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  uploading?: boolean;
}

const SUGGESTED_PROMPTS = [
  '🏢 Show Property Portfolio & Occupancy Rate',
  '📜 Which leases are expiring in the next 30 days?',
  '💳 What is the current status of PDC Received and Issued?',
  '📈 What is our total portfolio market valuation?',
  '📷 [Upload/Paste Screenshot] Analyze attached cheque or lease screenshot',
];

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Hello! I am your **AIGPMS AI Assistant**.\n\nYou can ask me natural language queries about properties, leases, tenants, PDC registers, financial receipts, or portfolio investments.\n\n✨ **New Screenshot Feature:** You can click the paperclip icon, drag & drop images, or simply press **`Ctrl + V`** to paste screenshots directly into the chat for image analysis!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle Clipboard Paste (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          addAttachment(file);
        }
      }
    }
  };

  const addAttachment = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const newAtt: Attachment = { file, previewUrl, uploading: false };
    setAttachments((prev) => [...prev, newAtt]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          addAttachment(file);
        }
      });
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSend = async (promptTextOverride?: string) => {
    const textToSend = promptTextOverride !== undefined ? promptTextOverride : inputPrompt;
    if (!textToSend.trim() && attachments.length === 0) return;

    setLoading(true);
    setInputPrompt('');

    // 1. Upload any attached images to backend `/api/v1/upload/image`
    const uploadedImageUrls: string[] = [];
    if (attachments.length > 0) {
      for (const att of attachments) {
        try {
          const formData = new FormData();
          formData.append('file', att.file);
          const uploadRes = await api.post('/upload/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (uploadRes.data?.url) {
            uploadedImageUrls.push(uploadRes.data.url);
          }
        } catch (err) {
          console.error('Image upload failed:', err);
        }
      }
    }

    const localTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `user-${Date.now()}`;

    // Add user message to chat state
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
      timestamp: localTimestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setAttachments([]);

    // 2. Query AI Chatbot Backend API
    try {
      const response = await api.post('/ai/chat', {
        prompt: textToSend || 'Analyzed attached screenshot',
        image_urls: uploadedImageUrls,
      });

      const aiData = response.data;
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiData.answer,
        suggestedActions: aiData.suggested_actions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **API Connection Error:** Unable to reach AI Service. Please verify backend service at \`/api/v1/ai/chat\`.`,
        timestamp: localTimestamp,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="p-4 md:p-6 max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <Paper elevation={2} className="p-4 mb-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
        <Box className="flex items-center gap-3">
          <Avatar className="bg-indigo-600 w-12 h-12 shadow-lg">
            <SmartToyIcon className="text-white text-2xl" />
          </Avatar>
          <Box>
            <Typography variant="h6" className="font-bold flex items-center gap-2">
              AIGPMS AI Assistant & Chatbot
              <Chip label="Multimodal Vision Enabled" color="secondary" size="small" className="text-xs font-semibold" />
            </Typography>
            <Typography variant="caption" className="text-slate-300">
              Natural Language Queries • Database RAG Insights • Screenshot & Image Analysis (`Ctrl + V`)
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Suggested Quick Prompts Bar */}
      <Box className="mb-3 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <Typography variant="caption" className="font-semibold text-slate-500 flex items-center gap-1 shrink-0">
          <LightbulbIcon fontSize="small" className="text-amber-500" /> Suggested:
        </Typography>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <Chip
            key={idx}
            label={prompt}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            clickable
            size="small"
            className="bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 font-medium shrink-0"
          />
        ))}
      </Box>

      {/* Chat Messages Container */}
      <Paper
        elevation={1}
        className="flex-1 p-4 overflow-y-auto rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-4"
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'
            }`}
          >
            <Avatar
              className={msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}
            >
              {msg.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
            </Avatar>

            <Box className="flex flex-col gap-1">
              <Paper
                elevation={1}
                className={`p-4 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                {/* Image Attachments inside message bubble */}
                {msg.imageUrls && msg.imageUrls.length > 0 && (
                  <Box className="flex flex-wrap gap-2 mb-3">
                    {msg.imageUrls.map((url, i) => (
                      <Box
                        key={i}
                        onClick={() => setLightboxUrl(getFileUrl(url))}
                        className="cursor-pointer overflow-hidden rounded-lg border border-slate-300 hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={getFileUrl(url)}
                          alt={`Attachment ${i + 1}`}
                          className="h-36 w-auto object-cover rounded-lg"
                        />
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Message Text with simple Markdown rendering */}
                <Typography
                  variant="body1"
                  className="whitespace-pre-line leading-relaxed text-sm md:text-base font-normal"
                >
                  {msg.text}
                </Typography>

                {/* Suggested Action Buttons if returned by AI */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <Box className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                    {msg.suggestedActions.map((action, aiIdx) => (
                      <Chip
                        key={aiIdx}
                        label={action}
                        size="small"
                        color="primary"
                        variant="outlined"
                        onClick={() => handleSend(action)}
                        className="cursor-pointer hover:bg-indigo-50"
                      />
                    ))}
                  </Box>
                )}
              </Paper>
              <Typography
                variant="caption"
                className={`text-xs text-slate-400 px-1 ${
                  msg.sender === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                {msg.timestamp}
              </Typography>
            </Box>
          </Box>
        ))}

        {loading && (
          <Box className="flex gap-3 self-start items-center">
            <Avatar className="bg-emerald-600 text-white">
              <SmartToyIcon />
            </Avatar>
            <Paper className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-3">
              <CircularProgress size={20} color="primary" />
              <Typography variant="body2" className="text-slate-600">
                AIGPMS AI Assistant is processing query & Analyzing screenshots...
              </Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      {/* Draft Attachments Preview Bar */}
      {attachments.length > 0 && (
        <Paper elevation={0} className="p-2 mt-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 overflow-x-auto">
          <Typography variant="caption" className="font-semibold text-indigo-700 flex items-center gap-1 shrink-0 px-2">
            <ImageIcon fontSize="small" /> Screenshots ({attachments.length}):
          </Typography>
          {attachments.map((att, idx) => (
            <Box key={idx} className="relative group shrink-0">
              <img
                src={att.previewUrl}
                alt="preview"
                className="h-16 w-16 object-cover rounded-lg border border-indigo-300 shadow-sm"
              />
              <IconButton
                size="small"
                onClick={() => removeAttachment(idx)}
                className="absolute -top-2 -right-2 bg-red-600 text-white hover:bg-red-700 p-0.5 shadow"
              >
                <CloseIcon style={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Paper>
      )}

      {/* Input Box & Action Bar */}
      <Paper
        elevation={3}
        className="mt-3 p-2 rounded-2xl bg-white border border-slate-300 flex flex-col gap-2 shadow-md"
      >
        <Box className="flex items-center gap-2 px-2">
          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            className="hidden"
          />

          <Tooltip title="Attach screenshot or image file">
            <IconButton
              color="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <AttachFileIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Press Ctrl + V anywhere on this input to paste a screenshot directly">
            <Box className="hidden sm:flex items-center gap-1 text-slate-400 text-xs px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
              <ContentPasteIcon fontSize="small" className="text-slate-500" />
              <span>Paste Screenshot (Ctrl+V)</span>
            </Box>
          </Tooltip>

          {/* Main Input Textfield */}
          <TextField
            fullWidth
            placeholder="Ask AIGPMS AI Assistant (e.g. 'Show expiring leases' or paste a screenshot with Ctrl+V)..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              className: 'text-sm md:text-base px-2 py-1',
            }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSend()}
            disabled={loading || (!inputPrompt.trim() && attachments.length === 0)}
            className="rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-700 shadow-md font-semibold text-white flex items-center gap-1"
          >
            <span>Send</span>
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </Paper>

      {/* Lightbox Dialog for inspecting full-size images */}
      <Dialog
        open={Boolean(lightboxUrl)}
        onClose={() => setLightboxUrl(null)}
        maxWidth="lg"
      >
        <DialogContent className="p-0 bg-black relative flex items-center justify-center">
          <IconButton
            onClick={() => setLightboxUrl(null)}
            className="absolute top-2 right-2 text-white bg-slate-800/80 hover:bg-slate-700"
          >
            <CloseIcon />
          </IconButton>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Screenshot High Res"
              className="max-h-[85vh] max-w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AIChat;
