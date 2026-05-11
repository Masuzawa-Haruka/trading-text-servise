<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:git-workflow-rules -->
# Git Workflow Policy (PRベース・見栄え重視)
- **Branching**: 指示がない限り、新しいブランチは必ず `develop` ブランチから切ること。ただし、作業の文脈やユーザーの指示によっては、新しくブランチを切らずに現在のブランチにそのまま変更（コミット）を追加する場合もある。
- **Pull Requests**: 原則として「ブランチ作成 → PR作成」のフローを通すこと。PRのターゲット（向き先）は常に `develop` とすること。
- **Merging**: `develop` の履歴を「1機能（1目的）＝1コミット」の一直線で美しく保つため、マージの際は基本的に Squash and merge（または Rebase and merge）を想定した綺麗な差分・コミット単位を意識すること。
<!-- END:git-workflow-rules -->
