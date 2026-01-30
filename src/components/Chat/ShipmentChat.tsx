import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Send, 
  User, 
  Truck, 
  Recycle, 
  Factory,
  Clock,
  CheckCheck,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  shipment_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  sender_company_id?: string;
  message: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

interface ShipmentChatProps {
  shipmentId: string;
  shipmentNumber: string;
}

const ShipmentChat: React.FC<ShipmentChatProps> = ({ shipmentId, shipmentNumber }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Real-time subscription
    const channel = supabase
      .channel(`shipment-chat-${shipmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shipment_messages',
          filter: `shipment_id=eq.${shipmentId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipmentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('shipment_messages')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الرسائل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !profile) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('shipment_messages')
        .insert({
          shipment_id: shipmentId,
          sender_id: user.id,
          sender_name: user.name || profile.full_name || 'مستخدم',
          sender_role: profile.role,
          sender_company_id: profile.company_id,
          message: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال الرسالة",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <User className="h-4 w-4" />;
      case 'driver': return <Truck className="h-4 w-4" />;
      case 'transporter': return <Truck className="h-4 w-4" />;
      case 'recycler': return <Recycle className="h-4 w-4" />;
      case 'generator': return <Factory className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500';
      case 'driver': return 'bg-blue-500';
      case 'transporter': return 'bg-orange-500';
      case 'recycler': return 'bg-green-500';
      case 'generator': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'driver': return 'سائق';
      case 'transporter': return 'ناقل';
      case 'recycler': return 'مُدوّر';
      case 'generator': return 'مولّد';
      default: return role;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return date.toLocaleDateString('ar-SA');
    }
  };

  const isOwnMessage = (senderId: string) => user?.id === senderId;

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin ml-2" />
          <span>جاري تحميل المحادثة...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-cairo text-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
            محادثة الشحنة #{shipmentNumber}
          </CardTitle>
          <Badge variant="outline">
            {messages.length} رسالة
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
              <p>لا توجد رسائل بعد</p>
              <p className="text-sm">ابدأ المحادثة الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedMessages).map(([date, dayMessages]) => (
                <div key={date}>
                  {/* Date Separator */}
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                      {formatDate(dayMessages[0].created_at)}
                    </div>
                  </div>
                  
                  {/* Messages */}
                  {dayMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage(message.sender_id) ? 'justify-start' : 'justify-end'} mb-3`}
                    >
                      <div className={`flex items-end gap-2 max-w-[80%] ${isOwnMessage(message.sender_id) ? 'flex-row' : 'flex-row-reverse'}`}>
                        {/* Avatar */}
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`${getRoleColor(message.sender_role)} text-white text-xs`}>
                            {getRoleIcon(message.sender_role)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Message Bubble */}
                        <div className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage(message.sender_id) 
                            ? 'bg-primary text-primary-foreground rounded-br-sm' 
                            : 'bg-muted rounded-bl-sm'
                        }`}>
                          {/* Sender Info */}
                          {!isOwnMessage(message.sender_id) && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">{message.sender_name}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {getRoleName(message.sender_role)}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Message Text */}
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.message}
                          </p>
                          
                          {/* Time & Status */}
                          <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                            isOwnMessage(message.sender_id) ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(message.created_at)}</span>
                            {isOwnMessage(message.sender_id) && (
                              <CheckCheck className="h-3 w-3 mr-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        {/* Message Input */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1"
              disabled={sending}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending}
              size="icon"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShipmentChat;
