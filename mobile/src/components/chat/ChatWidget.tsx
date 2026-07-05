import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Modal, Image } from 'react-native';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import { Feather } from '@expo/vector-icons';

const webotLogo = require('../../../assets/images/webot_logo.png');
import ChatModal from './ChatModal';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { C } = useAppTheme();
  const s = getStyles(C);

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity style={s.fab} onPress={() => setIsOpen(true)} activeOpacity={0.85}>
        <Image source={webotLogo} style={s.fabLogo} resizeMode="cover" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent
      >
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
    overflow: 'hidden',
    elevation: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  fabLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  }
});
