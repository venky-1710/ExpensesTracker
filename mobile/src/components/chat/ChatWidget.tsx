import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Modal } from 'react-native';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import ChatModal from './ChatModal';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { C } = useAppTheme();
  const s = getStyles(C);

  return (
    <>
      <TouchableOpacity style={s.fab} onPress={() => setIsOpen(true)} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
      </TouchableOpacity>
      
      <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={() => setIsOpen(false)}>
        <ChatModal onClose={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 0,
  }
});
