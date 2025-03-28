import React, { createContext, useContext } from 'react';
import { useQuestionBank, UseQuestionBankReturn } from '@/hooks/useQuestionBank';

const QuestionBankContext = createContext<UseQuestionBankReturn | null>(null);

export const useQuestionBankContext = () => {
  const context = useContext(QuestionBankContext);
  if (!context) {
    throw new Error('useQuestionBankContext must be used within a QuestionBankProvider');
  }
  return context;
};

export const QuestionBankProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const questionBank = useQuestionBank();

  return (
    <QuestionBankContext.Provider value={questionBank}>
      {children}
    </QuestionBankContext.Provider>
  );
}; 