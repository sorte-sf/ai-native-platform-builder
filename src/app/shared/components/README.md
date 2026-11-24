# Application building blocks

This directory owns reusable blocks for user-created applications, not Builder Studio's own shell.

`application-blocks.ts` registers palette entries and creates serializable instances with unique IDs. Layout, header, footer, sidenav and grid are compositions of the existing page-tree primitives. Users can select and edit their children, styles and button navigation targets.

`data-widget.component` renders KPI/chart nodes in the designer and published runtime. Designer previews are visibly placeholders and never request data. Runtime KPI values use the authorized query total. Category charts group up to 50 accessible records and clearly disclose that scope; they are not full-dataset analytical reports.

## Try the initial slice

1. Open an application's page designer and add **Application layout starter**.
2. Select the header/title and navigation buttons to edit content and page targets.
3. Select the content container in the tree, then add a grid, KPI or chart.
4. Bind dashboard widgets to a data object; charts require exactly one existing field key in the grouping input.
5. Save and publish. Unbound dashboard widgets cannot be published.

The layout is currently saved within a page. Reusable application-wide master layouts, responsive layout presets, menu synchronization, full-dataset chart aggregation and generalized button actions remain subsequent work. Do not treat this first slice as the complete application designer.
