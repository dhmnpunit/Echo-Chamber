import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadMessages: {}, // Track unread messages by userId

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      // Initialize unread messages for all users
      const unreadMessages = {};
      res.data.forEach(user => {
        if (!get().unreadMessages[user._id]) {
          unreadMessages[user._id] = 0;
        }
      });
      set(state => ({ 
        users: res.data,
        unreadMessages: { ...state.unreadMessages, ...unreadMessages }
      }));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set(state => ({
        messages: res.data,
        unreadMessages: {
          ...state.unreadMessages,
          [userId]: 0
        }
      }));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    
    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const currentUserId = useAuthStore.getState().user?._id;

      // Don't count messages from ourselves
      if (newMessage.senderId === currentUserId) {
        return;
      }

      // Update messages if chat is open
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set(state => ({
          messages: [...state.messages, newMessage]
        }));
      } else {
        // Increment unread count for the sender
        set(state => ({
          unreadMessages: {
            ...state.unreadMessages,
            [newMessage.senderId]: (state.unreadMessages[newMessage.senderId] || 0) + 1
          }
        }));

        // Show notification
        if (Notification.permission === "granted") {
          const sender = get().users.find(user => user._id === newMessage.senderId);
          new Notification("New Message", {
            body: `${sender?.fullName}: ${newMessage.text}`,
            icon: sender?.profilePic || "/avatar.png"
          });
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (user) => {
    set(state => ({
      selectedUser: user,
      unreadMessages: user ? {
        ...state.unreadMessages,
        [user._id]: 0
      } : state.unreadMessages
    }));
  },

  // Add method to manually clear unread messages for a user
  clearUnreadMessages: (userId) => {
    set(state => ({
      unreadMessages: {
        ...state.unreadMessages,
        [userId]: 0
      }
    }));
  },

  // Add method to get unread count for a specific user
  getUnreadCount: (userId) => {
    return get().unreadMessages[userId] || 0;
  }
}));















