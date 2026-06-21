import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserStats, SRSCard, ChatMessage } from '../types';

export function useFirebaseSync(
  stats: UserStats,
  setStats: React.Dispatch<React.SetStateAction<UserStats>>,
  cards: SRSCard[],
  setCards: React.Dispatch<React.SetStateAction<SRSCard[]>>,
  chatHistory: ChatMessage[],
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>
) {
  const [user, setUser] = useState<User | null>(null);
  const [syncLoading, setSyncLoading] = useState(true);

  // Monitor auth state and load data from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setSyncLoading(true);
        try {
          const userId = currentUser.uid;
          const userDocRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userDocRef).catch(e => {
            handleFirestoreError(e, OperationType.GET, `users/${userId}`);
            throw e;
          });

          if (userSnap.exists()) {
            // Load stats from Firestore
            const cloudStats = userSnap.data() as UserStats;
            setStats(cloudStats);

            // Load cards from Firestore
            const cardsColRef = collection(db, 'users', userId, 'cards');
            const cardsSnap = await getDocs(cardsColRef).catch(e => {
              handleFirestoreError(e, OperationType.LIST, `users/${userId}/cards`);
              throw e;
            });
            const cloudCards: SRSCard[] = [];
            cardsSnap.forEach(docSnap => {
              cloudCards.push(docSnap.data() as SRSCard);
            });
            if (cloudCards.length > 0) {
              setCards(cloudCards);
            }

            // Load chats from Firestore
            const chatsColRef = collection(db, 'users', userId, 'chats');
            const chatsSnap = await getDocs(chatsColRef).catch(e => {
              handleFirestoreError(e, OperationType.LIST, `users/${userId}/chats`);
              throw e;
            });
            const cloudChats: ChatMessage[] = [];
            chatsSnap.forEach(docSnap => {
              cloudChats.push(docSnap.data() as ChatMessage);
            });
            // Sort chats by timestamp chronologically
            cloudChats.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            if (cloudChats.length > 0) {
              setChatHistory(cloudChats);
            }
          } else {
            // First time sign-in: sync the current local progress to the Cloud
            await setDoc(userDocRef, stats).catch(e => {
              handleFirestoreError(e, OperationType.CREATE, `users/${userId}`);
            });

            // Sync vocabulary cards to sub-collection
            if (cards.length > 0) {
              const batch = writeBatch(db);
              cards.forEach(card => {
                const cardRef = doc(db, 'users', userId, 'cards', card.id);
                batch.set(cardRef, card);
              });
              await batch.commit().catch(e => {
                handleFirestoreError(e, OperationType.WRITE, `users/${userId}/cards`);
              });
            }

            // Sync chat logs to sub-collection
            if (chatHistory.length > 0) {
              const batch = writeBatch(db);
              chatHistory.forEach(msg => {
                const chatRef = doc(db, 'users', userId, 'chats', msg.id);
                batch.set(chatRef, msg);
              });
              await batch.commit().catch(e => {
                handleFirestoreError(e, OperationType.WRITE, `users/${userId}/chats`);
              });
            }
          }
        } catch (error) {
          console.error("Failed to load or sync user data from Firestore:", error);
        } finally {
          setSyncLoading(false);
        }
      } else {
        setSyncLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync mutations
  const updateCloudStats = async (newStats: UserStats) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, newStats).catch(e => {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    });
  };

  const uploadCloudCard = async (card: SRSCard) => {
    if (!user) return;
    const cardRef = doc(db, 'users', user.uid, 'cards', card.id);
    await setDoc(cardRef, card).catch(e => {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/cards/${card.id}`);
    });
  };

  const deleteCloudCard = async (cardId: string) => {
    if (!user) return;
    const cardRef = doc(db, 'users', user.uid, 'cards', cardId);
    await deleteDoc(cardRef).catch(e => {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/cards/${cardId}`);
    });
  };

  const uploadCloudChatMessage = async (msg: ChatMessage) => {
    if (!user) return;
    const chatRef = doc(db, 'users', user.uid, 'chats', msg.id);
    await setDoc(chatRef, msg).catch(e => {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/chats/${msg.id}`);
    });
  };

  const clearCloudChats = async (chatsToClear: ChatMessage[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    chatsToClear.forEach(msg => {
      const chatRef = doc(db, 'users', user.uid, 'chats', msg.id);
      batch.delete(chatRef);
    });
    await batch.commit().catch(e => {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/chats`);
    });
  };

  const signInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      // Revert back to local values from localStorage (default safe fallbacks)
      const savedStats = localStorage.getItem('aura_stats');
      const savedCards = localStorage.getItem('aura_cards');
      const savedChats = localStorage.getItem('aura_chat');

      if (savedStats) setStats(JSON.parse(savedStats));
      if (savedCards) setCards(JSON.parse(savedCards));
      if (savedChats) setChatHistory(JSON.parse(savedChats));
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  return {
    user,
    syncLoading,
    signInGoogle,
    logOut,
    updateCloudStats,
    uploadCloudCard,
    deleteCloudCard,
    uploadCloudChatMessage,
    clearCloudChats,
  };
}
