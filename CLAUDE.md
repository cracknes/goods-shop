# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

이 프로젝트는 회원가입·결제·관리자 기능을 갖춘 실전 웹 사이트입니다.
Supabase로 인증·DB를 처리하고, 토스페이먼츠로 결제를 연결합니다.

## 목표
- 사용자가 가입 후 상품을 구매할 수 있어야 합니다
- 관리자 페이지에서 주문 내역과 사용자를 확인할 수 있어야 합니다
- 결제는 토스 테스트 키로 동작하도록 합니다

## 스타일
- 코드는 가능한 단순하게 유지해 주세요
- 요청하지 않은 추가 기능은 임의로 넣지 말아 주세요

## 스택 / 호스팅
- 프론트엔드: 순수 HTML/CSS/JS (빌드 도구 없음), GitHub Pages로 배포
- 백엔드: Supabase (Auth + Postgres + Edge Functions)
- 결제: 토스페이먼츠 테스트 모드

## 관리자 계정
별도의 role 테이블 없이, **로그인 이메일이 `admin@admin.com`인지**로만 관리자 여부를 판별합니다.
관리자 계정도 일반 회원가입 페이지에서 `admin@admin.com` / `superadmin`으로 가입하면 그대로 동작합니다.

세부 아키텍처(페이지 구조, DB 스키마, 결제 흐름, 배포 절차)는 `ARCH.md` 참고.
