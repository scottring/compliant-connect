import React, { createContext, useContext } from 'react';
import { useQuestionBank, UseQuestionBankReturn } from '@/hooks/use-question-bank';

const QuestionBankContext = createContext<UseQuestionBankReturn | undefined>(undefined);

export function useQuestionBankContext() {
  const context = useContext(QuestionBankContext);
  if (!context) {
    throw new Error('useQuestionBankContext must be used within a QuestionBankProvider');
  }
  return context;
}

export function QuestionBankProvider({ children }: { children: React.ReactNode }) {
  const questionBankData = useQuestionBank();

  return (
    <QuestionBankContext.Provider value={questionBankData}>
      {children}
    </QuestionBankContext.Provider>
  );
} 