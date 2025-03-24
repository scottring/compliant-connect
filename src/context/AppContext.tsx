
import React, { createContext, useContext, useState } from "react";
import { Company, ProductSheet, Question, Tag, User, Section, Subsection } from "../types";
import { mockCompanies, mockProductSheets, mockQuestions, mockTags, mockUsers } from "../data/mockData";
import { toast } from "sonner";

interface AppContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  companies: Company[];
  addCompany: (company: Omit<Company, "id" | "progress">) => void;
  updateCompany: (company: Company) => void;
  deleteCompany: (id: string) => void;
  productSheets: ProductSheet[];
  addProductSheet: (productSheet: Omit<ProductSheet, "id" | "createdAt" | "updatedAt" | "answers">) => void;
  updateProductSheet: (productSheet: ProductSheet) => void;
  deleteProductSheet: (id: string) => void;
  questions: Question[];
  addQuestion: (question: Omit<Question, "id">) => void;
  updateQuestion: (question: Question) => void;
  deleteQuestion: (id: string) => void;
  tags: Tag[];
  addTag: (tag: Omit<Tag, "id">) => void;
  updateTag: (tag: Tag) => void;
  deleteTag: (id: string) => void;
  sections: Section[];
  addSection: (section: Omit<Section, "id">) => void;
  updateSection: (section: Section) => void;
  deleteSection: (id: string) => void;
  subsections: Subsection[];
  addSubsection: (subsection: Omit<Subsection, "id">) => void;
  updateSubsection: (subsection: Subsection) => void;
  deleteSubsection: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(mockUsers[0]);
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [productSheets, setProductSheets] = useState<ProductSheet[]>(mockProductSheets);
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [tags, setTags] = useState<Tag[]>(mockTags);
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);

  const addCompany = (company: Omit<Company, "id" | "progress">) => {
    const newCompany: Company = {
      ...company,
      id: `c${companies.length + 1}`,
      progress: 0,
    };
    setCompanies([...companies, newCompany]);
    toast.success("Company added successfully");
  };

  const updateCompany = (company: Company) => {
    setCompanies(companies.map((c) => (c.id === company.id ? company : c)));
    toast.success("Company updated successfully");
  };

  const deleteCompany = (id: string) => {
    setCompanies(companies.filter((c) => c.id !== id));
    toast.success("Company deleted successfully");
  };

  const addProductSheet = (productSheet: Omit<ProductSheet, "id" | "createdAt" | "updatedAt" | "answers">) => {
    const newProductSheet: ProductSheet = {
      ...productSheet,
      id: `ps${productSheets.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      answers: [],
    };
    setProductSheets([...productSheets, newProductSheet]);
    toast.success("Product sheet added successfully");
  };

  const updateProductSheet = (productSheet: ProductSheet) => {
    setProductSheets(productSheets.map((ps) => (ps.id === productSheet.id ? productSheet : ps)));
    toast.success("Product sheet updated successfully");
  };

  const deleteProductSheet = (id: string) => {
    setProductSheets(productSheets.filter((ps) => ps.id !== id));
    toast.success("Product sheet deleted successfully");
  };

  const addQuestion = (question: Omit<Question, "id">) => {
    const newQuestion: Question = {
      ...question,
      id: `q${questions.length + 1}`,
    };
    setQuestions([...questions, newQuestion]);
    toast.success("Question added successfully");
  };

  const updateQuestion = (question: Question) => {
    setQuestions(questions.map((q) => (q.id === question.id ? question : q)));
    toast.success("Question updated successfully");
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
    toast.success("Question deleted successfully");
  };

  const addTag = (tag: Omit<Tag, "id">) => {
    const newTag: Tag = {
      ...tag,
      id: `tag${tags.length + 1}`,
    };
    setTags([...tags, newTag]);
    toast.success("Tag added successfully");
  };

  const updateTag = (tag: Tag) => {
    setTags(tags.map((t) => (t.id === tag.id ? tag : t)));
    toast.success("Tag updated successfully");
  };

  const deleteTag = (id: string) => {
    setTags(tags.filter((t) => t.id !== id));
    toast.success("Tag deleted successfully");
  };

  // New methods for Sections and Subsections
  const addSection = (section: Omit<Section, "id">) => {
    const newSection: Section = {
      ...section,
      id: `section${sections.length + 1}`,
    };
    setSections([...sections, newSection]);
    toast.success("Section added successfully");
  };

  const updateSection = (section: Section) => {
    setSections(sections.map((s) => (s.id === section.id ? section : s)));
    toast.success("Section updated successfully");
  };

  const deleteSection = (id: string) => {
    // Delete all subsections within this section
    const subsectionsToKeep = subsections.filter((s) => s.sectionId !== id);
    setSubsections(subsectionsToKeep);
    
    // Delete all questions within this section or its subsections
    const questionsToKeep = questions.filter((q) => q.sectionId !== id);
    setQuestions(questionsToKeep);
    
    // Delete the section
    setSections(sections.filter((s) => s.id !== id));
    toast.success("Section and related items deleted successfully");
  };

  const addSubsection = (subsection: Omit<Subsection, "id">) => {
    const newSubsection: Subsection = {
      ...subsection,
      id: `subsection${subsections.length + 1}`,
    };
    setSubsections([...subsections, newSubsection]);
    toast.success("Subsection added successfully");
  };

  const updateSubsection = (subsection: Subsection) => {
    setSubsections(subsections.map((s) => (s.id === subsection.id ? subsection : s)));
    toast.success("Subsection updated successfully");
  };

  const deleteSubsection = (id: string) => {
    // Delete all questions within this subsection
    const questionsToKeep = questions.filter((q) => q.subsectionId !== id);
    setQuestions(questionsToKeep);
    
    // Delete the subsection
    setSubsections(subsections.filter((s) => s.id !== id));
    toast.success("Subsection and related questions deleted successfully");
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        companies,
        addCompany,
        updateCompany,
        deleteCompany,
        productSheets,
        addProductSheet,
        updateProductSheet,
        deleteProductSheet,
        questions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        tags,
        addTag,
        updateTag,
        deleteTag,
        sections,
        addSection,
        updateSection,
        deleteSection,
        subsections,
        addSubsection,
        updateSubsection,
        deleteSubsection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
