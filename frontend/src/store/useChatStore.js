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
      set({ users: res.data });
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
      set({ messages: res.data });
      // Clear unread messages when opening a chat
      const unreadMessages = { ...get().unreadMessages };
      delete unreadMessages[userId];
      set({ unreadMessages });
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
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    
    socket.on("newMessage", (newMessage) => {
      // If chat is not selected, increment unread count
      if (!selectedUser || newMessage.senderId !== selectedUser._id) {
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [newMessage.senderId]: (state.unreadMessages[newMessage.senderId] || 0) + 1,
          },
        }));
        
        // Show notification
        if (Notification.permission === "granted") {
          const sender = get().users.find(user => user._id === newMessage.senderId);
          new Notification("New Message", {
            body: `${sender?.fullName}: ${newMessage.text}`,
            icon: sender?.profilePic || "/avatar.png"
          });
        }
      } else if (newMessage.senderId === selectedUser._id) {
        // If chat is selected, add message to current chat
        set({ messages: [...get().messages, newMessage] });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => {
    // Clear unread messages for the selected user
    const unreadMessages = { ...get().unreadMessages };
    if (selectedUser) {
      delete unreadMessages[selectedUser._id];
    }
    set({ selectedUser, unreadMessages });
  },
}));