# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

"지금은 충전중" — 번아웃 상태인 사람이 짧게 쉬는 연습을 해보는 정적 웹앱. 로그인 없이 기기의 `localStorage`에만 상태/기록을 저장한다. 배포 주소: https://bbabam-ashen.vercel.app/ 빌드 도구 없는 순수 HTML/CSS/JS.

- `index.html` — SPA 진입점, 화면 6개(상태 고르기, 돌아보기, 배터리 보기, 쉼 연습 고르기, 타이머, 마무리)를 섹션으로 담고 JS로 show/hide 전환
- `css/style.css` — 전체 스타일
- `js/storage.js` — localStorage 읽기/쓰기와 키 이름(다른 파일은 localStorage를 직접 쓰지 않는다)
- `js/states.js` — 상태 느낌 카드 데이터(배터리 매핑 포함)
- `js/restPractices.js` — 쉼 연습 종류별 데이터와 유도 문구
- `js/sound.js` — 효과음, 배경 소리(합성음 + 유튜브 임베드), 소리 켜기/끄기
- `js/keyboard.js` — 키보드 단축키
- `js/app.js` — 화면 전환, 타이머, 기록 화면. 화면 id는 `SCREEN`, 쉼 시간 목록은 `DURATIONS`에 모여 있다

스크립트 로드 순서가 곧 의존 순서다: `storage → states → restPractices → sound → keyboard → app`. 모두 전역 함수라 순서를 바꾸면 `is not defined` 오류가 난다.

톤 원칙: 진단/평가처럼 보이는 문구나 수치를 피하고, 압박 없는 따뜻한 말투를 유지한다.

## 현재 기능

- 상태별 쉼 연습 추천: 상태를 고르면 어울리는 연습이 미리 선택되어 있다.
- 쉼 연습 6가지: 숨 고르기, 몸 풀기, 눈 감고 듣기, 멍 때리기·낙서, 창밖 바라보기, 몸 가볍게 두드리기
- 시간 선택: 1분, 3분, 5분, 30분, 1시간. 긴 시간에는 안내 문구가 천천히 바뀌고, 마지막 1분에 마무리 문구가 나온다.
- 배경 소리: 기내소리, 백색소음(브라우저 합성음), 모닥불, 빗소리(유튜브 임베드). 소리 켜기/끄기 버튼이 있고 켜짐 여부가 화면에 분명히 보인다.
- 마무리 화면에서 한 줄 메모를 남길 수 있고, 돌아보기 화면에서 지난 기록을 볼 수 있다.
- 넓은 화면(900px 이상)에서는 폭 720px, 상태 카드 3열, 연습 카드 2열로 보이고, 마우스 hover와 키보드 포커스 표시가 있다.
- 키보드 단축키(메모 입력 중에는 꺼짐): 상태 고르기에서 숫자 키로 카드 선택, 쉼 연습 화면에서 Enter로 시작, 타이머·돌아보기·마무리 화면에서 Esc로 나가기.
- 타이머는 끝나는 시각 기준으로 계산해서 탭을 옮기거나 화면이 꺼져도 시간이 맞고, 타이머 중에는 화면이 꺼지지 않게 요청한다(Wake Lock).
- 배터리·쉼 연습 화면에 뒤로 버튼(Esc)이 있고, 2분 이상 쉼에서 그만하기는 확인을 거친다. 돌아보기에서 기록을 모두 지울 수 있다.
- 소리가 꺼진 채 시작하면 안내가 나오고, 합성음 배경 소리를 고르면 소리가 자동으로 켜진다.
- localStorage 키: `charging_state`, `charging_log`, `sound_enabled`, `ambient_sound`

## Commands

별도 빌드 없음. 로컬에서는 폴더에서 `python3 -m http.server 8000`을 실행하고 `http://localhost:8000`으로 연다. `index.html`을 파일로 직접 열면 유튜브 소리(모닥불, 빗소리)가 재생되지 않는다. 나머지 기능은 직접 열어도 된다.
