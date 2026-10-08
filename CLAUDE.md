# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

"지금은 충전중" — 번아웃 상태인 사람이 짧게 쉬는 연습을 해보는 정적 웹앱. 로그인 없이 기기의 `localStorage`에만 상태/기록을 저장한다. 빌드 도구 없는 순수 HTML/CSS/JS.

- `index.html` — SPA 진입점, 화면 5개(상태 고르기 → 배터리 보기 → 쉼 연습 고르기 → 타이머 → 마무리)를 섹션으로 담고 JS로 show/hide 전환
- `css/style.css` — 전체 스타일
- `js/states.js` — 상태 느낌 카드 데이터(배터리 매핑 포함)
- `js/restPractices.js` — 쉼 연습 종류별 데이터와 유도 문구
- `js/app.js` — 화면 전환, 타이머, localStorage 읽기/쓰기

톤 원칙: 진단/평가처럼 보이는 문구나 수치를 피하고, 압박 없는 따뜻한 말투를 유지한다.

## Commands

별도 빌드/서버 없음. `index.html`을 브라우저로 직접 열거나 로컬 정적 서버로 확인.
