# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
bun dev          # Start development server (Vite)
bun build        # TypeScript check + Vite build
bun lint         # Run ESLint
bun preview      # Preview production build
```

## Architecture

This is a React-based Ethereum web wallet built with Vite, designed to run entirely in the browser with no backend server.

### Tech Stack
- **React 19** with TypeScript
- **Vite 7** for bundling
- **Tailwind CSS 4** with `@tailwindcss/vite` plugin
- **shadcn/ui** components (base-lyra style) built on `@base-ui/react`
- **Wagmi** + **Viem** for Ethereum interactions
- **Jotai** for state management
- **TanStack Query** for async state
- **TanStack Form** for form handling

### Project Structure

- `src/components/ui/` - shadcn/ui primitives (button, card, input, select, etc.)
- `src/components/` - Application components for wallet operations
- `src/lib/utils.ts` - `cn()` utility for merging Tailwind classes
- `src/providers.tsx` - Provider wrapper (ThemeProvider, WagmiProvider, QueryClientProvider, JotaiProvider)

### Key Patterns

**Wallet Storage**: Wallets are encrypted client-side using `ox` library's Keystore encryption with PBKDF2 key derivation. Mnemonic phrases are encrypted with user passwords and stored in browser storage via Jotai atoms.

**Chain Configuration**: Wagmi is configured with multiple EVM chains (mainnet, arbitrum, base, unichain + testnets). RPC URLs come from environment variables prefixed with `VITE_` (e.g., `VITE_MAINNET_RPC_URL`).

**Component Styling**: Components use `class-variance-authority` (CVA) for variant-based styling. The `cn()` utility combines `clsx` and `tailwind-merge`.

**Import Alias**: Use `@/` for imports from `src/` (e.g., `@/components/ui/button`).
