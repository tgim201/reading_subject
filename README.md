# 📚 교과 독서전략 수업지도안 만들기

2022 개정 교육과정 온톨로지(사회·과학·수학·기술가정·국어), 독서전략(`readstrategy.ttl`), 텍스트 유형(`text.ttl`), 가네의 9가지 수업사태(`가네.ttl`)를 연결해 **교과 읽기자료 + 독서 활동지 + 가네 9사태 수업지도안**을 만드는 웹 프로그램입니다. 교사는 3단계 화면(교과 내용 고르기 → 글 유형·독서전략 → 지도안 완성)만 따라가면 됩니다.

## 1. 실행하기 (내 컴퓨터)

1. **Node.js LTS** 설치: <https://nodejs.org> (또는 PowerShell에서 `winget install OpenJS.NodeJS.LTS`) 후 터미널을 다시 엽니다.
2. 프로젝트 폴더에서:
   ```bash
   npm install
   npm run dev        # http://localhost:5173 접속
   ```
3. 배포 전 점검: `npm run build` → `npm run preview`

> 로그인: 교사는 이름만 입력. 관리자 비밀번호는 `src/components/Login.jsx`의 `ADMIN_PASSWORD`(기본 `admin1234`)이며 **배포 전에 꼭 바꾸세요**(화면 접근용일 뿐 보안 장치는 아닙니다).

## 2. GitHub로 배포하기 (GitHub Pages, 무료)

### ① Git 설치 및 최초 설정 (한 번만)
```powershell
winget install Git.Git          # 설치 후 터미널 다시 열기
git config --global user.name  "내이름"
git config --global user.email "내GitHub이메일"
```

### ② GitHub에서 빈 저장소 만들기
1. <https://github.com/new> 접속 → Repository name 입력(예: `reading-lesson-planner`)
2. **Public** 선택(무료 Pages는 공개 저장소), README/.gitignore 추가 옵션은 **모두 체크 해제** → Create repository

### ③ 코드 올리기 (프로젝트 폴더에서)
```powershell
git init
git add .
git commit -m "feat: 독서전략 수업지도안 생성기"
git branch -M main
git remote add origin https://github.com/<내아이디>/<저장소이름>.git
git push -u origin main
```
(로그인 창이 뜨면 GitHub 계정으로 로그인합니다.)

### ④ Pages 켜기 (한 번만)
저장소 → **Settings → Pages → Build and deployment → Source: `GitHub Actions`** 선택.

### ⑤ 확인
저장소의 **Actions** 탭에서 `Deploy to GitHub Pages`가 초록색 ✔이 되면
`https://<내아이디>.github.io/<저장소이름>/` 에서 접속됩니다. (처음엔 1~3분 걸립니다)

### ⑥ 이후 수정할 때
```powershell
git add .
git commit -m "수정 내용"
git push
```
푸시할 때마다 자동으로 다시 배포됩니다. (`.github/workflows/deploy.yml`)

### 자주 막히는 곳
| 증상 | 해결 |
|---|---|
| `git`/`npm`을 찾을 수 없음 | 설치 후 터미널(또는 VS Code)을 완전히 다시 열기 |
| Actions 배포 실패(빌드 오류) | Actions 로그 확인 → 로컬에서 `npm run build`로 재현 |
| 페이지가 404 | Settings → Pages의 Source가 `GitHub Actions`인지 확인 |
| 화면이 하얗게 나옴 | `vite.config.js`의 `base: './'` 유지 |

## 3. 새 교과 추가하는 방법 (코드 수정 없음)

교과는 `.ttl` 파일 안에 `ex:Subject` 인스턴스가 있으면 **자동 인식**됩니다. 기존 5개 교과 파일과 같은 구조(`hasArea → LearningArea → hasCoreIdea / hasContentElement`, `KnowledgeUnderstanding`, `ProcessSkill` 등)로 작성하세요.

- **방법 A (모든 교사에게 적용):** 새 `.ttl`을 `src/ontologies/`에 넣고 `git add . && git commit && git push`
- **방법 B (바로 테스트):** 관리자로 입장 → `🛠 온톨로지 관리` → 파일 업로드(문법 검사 후 추가). 이 브라우저에만 저장됩니다.

독서전략·텍스트 유형·수업사태·정보활용 수업전략도 같은 방식으로 `.ttl`을 보강할 수 있고, 새 독서전략의 상세 적용 방법은 `src/services/strategyGuides.js`에 항목 하나만 추가하면 됩니다(없으면 기본 안내가 사용됨). 정보활용 수업전략은 `.ttl`의 `strategyDescription`이 그대로 지도안에 쓰입니다.

## 3-1. 정보활용 수업전략(`instruction_strategy.ttl`) 연계 방식
파일 안에 `ex:InstructionalStrategy`가 있으면 자동 인식됩니다.

| 온톨로지 정보 | 시스템에서의 사용 |
|---|---|
| `hasSkillVerb` (기능어: 수집하기·분석하기…) | 선택한 교과 **과정·기능** 문구와 맞춰 추천 점수 산정(예: “자료 수집·분석하기” → 수집·분석 전략) |
| `hasGenre` (논픽션-원인결과 등) | 글의 **내용 유형**(설명·논증·서사…)과 맞춰 가산점 |
| `targetSchoolLevel` | 학년에 맞지 않는 전략(고 전용 등) 자동 제외 |
| `strategyDescription` | 지도안 교사 활동에 설명문으로 삽입 |
| 기능어 성격 | 공유·토론형 → 7단계(피드백), 제작·발표형 → 9단계(파지와 전이), 그 외 → 6단계(학생 수행)에 자동 배치 |

2단계 화면에서 **독서전략(필수)** 과 **정보활용 수업전략(선택)** 을 함께 고르면 하나의 가네 9사태 지도안으로 결합됩니다. 두 파일에 같은 이름의 전략(SQ3R, 벤다이어그램 등)이 있으면 독서전략 쪽을 사용하고 수업전략 추천에서는 중복 제외합니다.

## 4. AI(Gemini) 연결 (선택)
`⚙️ 설정`에서 [Google AI Studio](https://aistudio.google.com/apikey)의 API 키를 입력하면 AI가 800~1,200자 읽기자료와 지도안을 작성합니다. 키가 없거나 호출이 실패하면 온톨로지(핵심 아이디어·독서전략)로 만든 **기본 초안**이 나오며, 모든 내용은 화면에서 직접 수정할 수 있습니다. 키는 브라우저에만 저장됩니다.

## 5. 폴더 구조
```
src/ontologies/*.ttl        온톨로지 (여기에 파일을 넣으면 자동 반영)
src/services/ontologyEngine.js   TTL 파싱·종류 자동 판별·독서전략 추천
src/services/strategyGuides.js   독서전략별 적용 단계·활동지 질문
src/services/generator.js        Gemini 프롬프트 / 오프라인 초안 생성
src/services/exportUtils.js      복사·.md·.doc·인쇄
src/components/                  로그인·3단계 마법사·보관함·관리자·설정
```

## 6. 개발 가이드(`code_artifact.md`)와 달라진 점
- **Firebase는 사용하지 않고** 브라우저 저장소(localStorage)로 대체했습니다(서버 없이 GitHub Pages만으로 동작). 교사 간 공유·계정 관리가 필요하면 Firebase 연동을 추가할 수 있습니다.
- 한글(HWP) 직접 저장 대신 한글·워드에서 열 수 있는 `.doc`, 마크다운, 인쇄(PDF)를 제공합니다.
