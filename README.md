# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## 開発者向けツール

### 能力抽選分布テスト画面

能力値（漫画家能力・担当編集能力・総合能力）の確率分布を検証するための開発者向けツールです。

**アクセス方法:**
```
http://localhost:5173/?dev=ability-test
```

**機能:**
- 100回・1,000回・10,000回の抽選回数を選択可能
- 各回で漫画家能力・担当編集能力・総合能力を生成
- 統計情報の表示:
  - 平均・中央値・最小・最大値
  - 80以上・90以上・100の出現回数と割合
- 分布をヒストグラムで可視化（3種類の能力値ごと）
- 実際のゲームと同じ `SeededRandom` を使用

**実装詳細:**
- ファイル: `src/components/screens/AbilityDistributionTestScreen.tsx`
- スタイル: `src/components/screens/AbilityDistributionTestScreen.css`
- 既存の能力生成関数を再利用: `src/game/ability.ts`
  - `generateMangakaAbility()`
  - `generateEditorAbility()`
- ゲームセーブデータや進行状況に影響を与えない独立した画面

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
