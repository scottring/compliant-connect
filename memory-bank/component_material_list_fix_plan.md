# Plan to Fix `component_material_list` Display Issue in Company Review

**Date:** 2025-04-11

**Problem:**
Data for questions of type `component_material_list` is not displaying correctly on the company review page (`src/pages/CustomerReview.tsx`).

**Root Cause Analysis:**
- The parent component (`CustomerReview.tsx`) fetches component and material data from dedicated tables (`pir_response_components`, `pir_response_component_materials`).
- It correctly assembles this data into a nested structure (array of components with nested materials).
- However, it assigns this assembled structure to the `response.answer` property of the relevant `pir_responses` object (line ~553).
- The child component responsible for rendering the question (`src/components/reviews/ReviewQuestionItem.tsx`) expects to find this structured data in the `answer.value` property (line ~75).
- This mismatch (`response.answer` vs `answer.value`) prevents the data from being accessed and rendered correctly.

**Chosen Solution (Alternative 1 - Fix Prop Mapping):**
Modify the child component (`ReviewQuestionItem.tsx`) to read the structured data from the correct property where the parent component places it.

**Implementation Steps:**
1.  In `src/components/reviews/ReviewQuestionItem.tsx`:
    *   Locate the code block handling the `component_material_list` type (around line 71-78).
    *   Change the line that accesses the data (currently `const components = answer?.value as Component[];`) to read from `answer.answer` instead: `const components = answer?.answer as Component[];`.
    *   Ensure appropriate type casting and handling for potentially undefined `answer` or `answer.answer`.
2.  Verify the fix by checking the company review page in the browser.

**Reasoning for Choice:**
- Directly addresses the identified bug.
- Minimal code change required.
- Leverages the existing, sound relational database structure.
- Lowest risk and effort compared to larger refactoring alternatives.

**Next Step:**
Switch to Code mode to implement the changes in `src/components/reviews/ReviewQuestionItem.tsx`.