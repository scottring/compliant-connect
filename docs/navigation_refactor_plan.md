# Navigation Refactor Plan (2025-04-11)

## Goal
Revise the site navigation and terminology based on user suggestions, leveraging the existing sidebar structure revealed in `src/components/Sidebar.tsx`.

## Analysis Summary
The current `Sidebar.tsx` already implements a hierarchical structure closer to the target than initially thought based on `Navigation.tsx`. Key changes involve adding new sections, consolidating existing ones, and ensuring page content aligns with the new descriptions.

## Revised Step-by-Step Plan

```mermaid
graph TD
    A[Start: Current Sidebar Structure] --> B(Phase 1: Add New Sections & Consolidate);
    B --> C(Phase 2: Build Info Hub & Reports);
    C --> D(Phase 3: Align Page Content);
    D --> E(Phase 4: Refine Settings & Finalize);
    E --> F[End: New Structure Implemented];

    subgraph Phase 1
        B1[Add Placeholders: Info Hub, Reports, Settings to Sidebar.tsx]
        B2[Create Placeholder Pages & Routes]
        B3[Combine QBank/Tags in Sidebar.tsx & Page]
        B4[Backend Analysis/Prep (Optional)]
    end

    subgraph Phase 2
        C1[Build Info Requests Hub Page Functionality]
        C2[Build Reports Page Functionality]
    end

    subgraph Phase 3
        D1[Refine Dashboard Page Content]
        D2[Refine 'Our Customers' Page Content (incl. requests)]
        D3[Refine 'Our Suppliers' Page Content (incl. requests)]
        D4[Refine 'Supplier Products' Page Content (incl. requests)]
        D5[Refine 'Our Products' Page Content (incl. requests)]
        D6[Refine Combined QBank/Tags Page Content]
    end

    subgraph Phase 4
        E1[Refine/Build Settings Page Content]
        E2[Remove/Refactor Old Request Pages (e.g., OutgoingPIRs)]
        E3[Final Terminology Sweep & Testing]
    end

    A --> B1; A --> B2; A --> B3; A --> B4;
    B --> C1; B --> C2;
    C --> D1; C --> D2; C --> D3; C --> D4; C --> D5; C --> D6;
    D --> E1; D --> E2; D --> E3;
```

## Key Implementation Steps

1.  **Phase 1: Add New Sections & Consolidate:**
    *   Modify `Sidebar.tsx` to add placeholder links/groups for "Info Requests", "Reports", and "Settings".
    *   Create corresponding empty placeholder pages and configure routes.
    *   Update `Sidebar.tsx` to combine "Question Bank" and "Tags" into a single link/group. Create/update the target page.
    *   (Optional) Analyze backend for necessary adjustments for new data views.
2.  **Phase 2: Build Info Hub & Reports:**
    *   Implement the functionality for the "Info Requests" hub page.
    *   Implement the functionality for the "Reports" page.
3.  **Phase 3: Align Page Content:**
    *   Review and update the content/functionality of existing pages (`Dashboard`, `Our Customers`, `Our Suppliers`, `Supplier Products`, `Our Products`, combined `QBank/Tags`) to match the detailed descriptions provided in the initial suggestions (e.g., integrating request summaries).
4.  **Phase 4: Refine Settings & Finalize:**
    *   Refine or build out the "Settings" page content.
    *   Decide on and implement the handling of old request pages (e.g., `OutgoingPIRs.tsx`, `SupplierIncomingRequests.tsx`) - likely refactor/remove.
    *   Perform a final terminology consistency check and thorough testing.