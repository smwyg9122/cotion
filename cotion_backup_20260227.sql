--
-- PostgreSQL database dump
--

\restrict QmbipvpcJ0DUMHbf3h2fRBgZCXuATReYEiFrSBc8U0uN78u1Zp5apJKNOSFChN8

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ltree; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA public;


--
-- Name: EXTENSION ltree; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION ltree IS 'data type for hierarchical tree-like structures';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_id_seq OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(500) NOT NULL,
    content text,
    icon character varying(50),
    cover_image character varying(500),
    path public.ltree NOT NULL,
    parent_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by uuid,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    "position" integer DEFAULT 0 NOT NULL,
    category character varying(100) DEFAULT NULL::character varying
);


ALTER TABLE public.pages OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token character varying(500) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address character varying(45),
    user_agent text
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    avatar_url character varying(500),
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at timestamp with time zone,
    username character varying(50) DEFAULT 'user'::character varying NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	20240101000001_create_users.ts	1	2026-02-07 16:00:32.719+00
2	20240101000002_create_sessions.ts	1	2026-02-07 16:00:34.473+00
3	20240101000003_create_pages.ts	1	2026-02-07 16:00:37.348+00
4	20240101000004_add_username_to_users.ts	1	2026-02-07 16:00:38.621+00
5	20240101000005_add_category_to_pages.ts	2	2026-02-08 07:06:40.264+00
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pages (id, title, content, icon, cover_image, path, parent_id, created_by, created_at, updated_at, updated_by, is_deleted, deleted_at, "position", category) FROM stdin;
a86f91f2-224e-4bac-a3bb-cea77baafa88	3. 로스케 커피 서비스	<p>[솔로, 카페] 로스케 커피 서비스 </p><p>Loske Coffee Service</p>	\N	\N	root.a86f91f2_224e_4bac_a3bb_cea77baafa88	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-16 00:22:15.945631+00	2026-02-16 00:22:44.54608+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	13	아유타 인스타그램 포스팅
9f9efac0-cb0b-4201-8b38-ccc0ac9f0dc7	Cotion 개선사항	<p><strong>테스트트트</strong></p><p></p>	\N	\N	root.9f9efac0_cb0b_4201_8b38_ccc0ac9f0dc7	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 07:24:53.076089+00	2026-02-08 07:31:02.712195+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 07:31:02.712195+00	9	운영
563091ca-b07c-4b33-82a9-19a97c257823	테스트		\N	\N	root.563091ca_b07c_4b33_82a9_19a97c257823	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-13 07:12:42.543262+00	2026-02-13 07:12:59.057292+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-13 07:12:59.057292+00	6	\N
7fa70969-3f1b-443c-87be-ec5e478bc522	Cotion 개선사항		\N	\N	root.7fa70969_3f1b_443c_87be_ec5e478bc522	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 07:30:35.239367+00	2026-02-08 07:45:30.540284+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 07:45:30.540284+00	10	운영
5c506d1f-1426-4fe2-8039-0166e97cf470	Coffee Community 개선사항		\N	\N	root.5c506d1f_1426_4fe2_8039_0166e97cf470	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 06:55:32.654335+00	2026-02-08 07:45:38.809231+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 07:45:38.809231+00	6	운영
58c9344f-b3d8-4410-a22f-fa458b323fbe	Cotion 개선사항	<p>바이</p><p></p><p></p><p></p>	\N	\N	root.58c9344f_b3d8_4410_a22f_fa458b323fbe	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 07:17:48.843202+00	2026-02-08 07:46:23.611431+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 07:46:23.611431+00	8	운영
d412f940-7e19-4eea-9ce4-046236ad8a55	4. 인미구나니	<p>[족자, 카페] 인미구나니</p><p>inmigunani</p><p></p>	\N	\N	root.d412f940_7e19_4eea_9ce4_046236ad8a55	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-16 00:24:36.112387+00	2026-02-16 00:25:28.59542+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	14	아유타 인스타그램 포스팅
6f3ad770-ee14-4609-bef3-9f08ef14224e	5. 웻패시 커피	<p>[족자, 카페] 웻패시 커피</p><p>Westpash Coffee</p>	\N	\N	root.6f3ad770_ee14_4609_bef3_9f08ef14224e	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-16 00:27:59.059838+00	2026-02-16 00:28:35.667629+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	15	아유타 인스타그램 포스팅
0eeee5e1-645a-4b63-961c-7c67f6888c05	Cotion 개선사항	<p>Cotion 개선사항 편하게 쭉 적어주세요</p><p></p><ul><li><p>검색 기능 추가</p></li><li><p>태그 및 알람 기능 추가</p></li><li><p>단락 구별을 위한 줄 넣기 기능 부탁드립니다</p></li><li><p>게시물 작성 이후 좌측 목록 정렬 기능?</p></li></ul><p></p>	\N	\N	root.0eeee5e1_645a_4b63_961c_7c67f6888c05	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 10:51:26.449314+00	2026-02-16 00:32:11.390538+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	1	운영
fe021e43-da1b-47c6-9478-3d6d45f74e0a	테스트	<p>헬로우</p><p></p><p></p>	\N	\N	root.fe021e43_da1b_47c6_9478_3d6d45f74e0a	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 01:46:06.288319+00	2026-02-08 06:40:10.303446+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 06:40:10.303446+00	1	\N
9dbc94ff-385b-44e6-8096-cc1155d586c7	Cotion 개선사항		\N	\N	root.9dbc94ff_385b_44e6_8096_cc1155d586c7	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 07:47:01.000366+00	2026-02-08 10:51:10.21196+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 10:51:10.21196+00	10	\N
435d4450-f53d-4d40-ae10-f8186e4c4df1	Coffee Community 개선사항		\N	\N	root.435d4450_f53d_4d40_ae10_f8186e4c4df1	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 07:45:48.093451+00	2026-02-08 10:51:14.531178+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 10:51:14.531178+00	9	\N
ad5fa21d-f4c4-4b50-b1ad-744cc9d0f81e	Cotiob	<p><strong>ffffffsf</strong></p>	\N	\N	root.ad5fa21d_f4c4_4b50_b1ad_744cc9d0f81e	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 07:53:35.287618+00	2026-02-08 10:51:18.198798+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 10:51:18.198798+00	11	\N
49ef1df9-b305-4e9e-9c16-83eeb41db1fa	2026.2.13 따리오노, 수출 관련 질의응답	<p>2026.2.13</p><p><strong>UGM 따리오노 교수와의 질의응답 정리 (수출과 관련하여)</strong></p><p></p><p>먼저 향신료 수출과 관련하여, 따리오노는 꽤나 신중한 입장을 보였다.</p><p>클로브(Cloves)의 경우, 수출 품목으로는 가격이 지나치게 높아 경쟁력이 없다고 보았다. 특히 아프리카 산지와 비교했을 때 인도네시아는 가격 면에서 불리하며, 마다가스카르와 같은 열대 지역에서는 이미 고품질이면서 가격 경쟁력을 갖춘 제품들이 세계 시장에 안정적으로 유통되고 있다고 설명했다. 따라서 클로브를 전략 수출 품목으로 삼는 것은 현실적으로 쉽지 않다는 의견이었다.</p><p>계피(Cinnamon)에 대해서는 자바보다 수마트라 지역이 훨씬 강한 시장 기반을 갖고 있다고 언급했다. 향신료 시장 전체가 이미 특정 지역 중심으로 구조화되어 있으며, 자바에서 경쟁하기는 어렵다는 뉘앙스였다. 만약 향신료를 고려한다면 중부 자바보다는 동부 자바 쪽이 가능성이 있을지도 모른다고 덧붙였다.</p><p>*후추(Pepper)에 대해서는 추천하지 않는다고 말했다.</p><p>따리오노는 코코(Cocoa)에 대해서는 비교적 긍정적인 의견을 제시했다.</p><p>코코의 경우 두 가지 루트가 가능하다고 설명했다.</p><p>첫 번째는 UGM이 소유 또는 운영에 관여하고 있는 코코 관련 회사다. 이 회사의 제품은 시중에서 유통되는 일반 코코보다 약 10% 정도 가격이 높지만, 자체 브랜드를 갖추고 있어 가격 대비 합리적인 수준이라고 평가했다. 무엇보다 수출 경험이 이미 있으며, 별도의 중개인을 통하지 않고 직접 수출이 가능하다는 점을 장점으로 언급했다. 즉, 유통 구조가 비교적 명확하고 안정적인 셈.</p><p>두 번째는 개별 농가 루트다. 따리오노는 코코를 재배하는 농부를 알고 있다고 했다. 규모는 크지 않지만, 이 역시 수출이 가능하다고 설명했다. 다만 이는 조직화된 대형 구조라기보다는 비교적 소규모 생산자 기반에 가까운 형태로 이해된다.</p><p>*10% 비싸더라도 UGM 쪽이 낫다고 생각됨.</p><p>바닐라 빈(Vanilla bean)에 대해서는</p><p>“모 아니면 도”라는 표현을 사용했다. 즉, 성공하면 수익성이 크지만, 그만큼 리스크도 크다는 의미로 생각된다 가장 먼저 언급된 리스크는 가격이었다. 바닐라 빈은 생각보다 매우 고가의 품목이며, 가격 변동성도 크기 때문에 수입 품목으로 선택할 경우 부담이 클 수 있다고 보았다. 다만, 만약 바닐라 빈을 고려한다면 유통 루트는 몇 가지가 있다고 했다.</p><p>첫 번째는 반자느가라(Banjarnegara) 지역이다. 카일라사 인근으로, 따리오노는 이 지역의 바닐라 빈 카르텔을 “잘 알고 있다”고 표현했다. 네트워크 접근성이 있다는 점을 강조한 것으로 보인다. 다만, 이 지역은 카일라사의 Pak Turno의 영향권, 즉 그의 구역임을 다시 한 번 분명히 했다.</p><p>두 번째는 족자카르타 인근, 칼리우랑(Kaliurang) 쪽에도 바닐라 빈 생산자가 있다고 언급했다. 정확한 구조나 규모에 대한 상세 설명은 없었지만, 접근 가능한 또 다른 루트로 제시되었다.</p><p>또한 바닐라 농가는 보통 300~400그루 정도를 재배한다고 설명하며, 결국 중요한 것은 유통 물량이라고 덧붙였다. 즉, 개별 농가 단위 생산량은 제한적이기 때문에 안정적인 수출을 위해서는 물량 확보와 조직화가 핵심인 것으로 보인다.</p><p>최근 커피 가격이 급등한 이유에 대해 묻자, 교수는 다소 놀란 반응을 보였다. 구체적인 원인에 대해서는 즉각적인 설명을 내놓기보다는, 한 번 확인해보겠다고 했다. 즉, 가격 급등의 배경(국제 시세, 생산 감소, 기후 영향, 투기적 요인 등)에 대해서는 추후 검토가 필요하다는 입장이었다.</p><p>한편, 카일라사가 위치한 반자느가라(Banjarnegara) 인근 지역에 대해서는 비교적 긍정적인 전망을 제시했다. 해당 지역이 향후 아라비카 시장에서 상당히 영향력 있는 생산지대로 성장할 가능성이 있다고 보았으며, 같은 까닭으로 카일라사와의 사업을 시작하는 것을 권했다. 즉, 중장기적으로 생산 기반이 강화될 지역이라는 판단에서 였다. 다만 통상적인 수출 구조, 특히 수출업자가 어느 정도의 마진을 요구하는지에 대해서는 정확히 알지 못한다고 한다. 현장 생산과 지역 구조에 대해서는 의견을 제시했지만, 구체적인 무역 실무나 가격 구조에 대해서는 본인의 관여 영역이 아니라는 뜻…</p><p>전반적으로 커피에 대해서는 향신료보다 훨씬 현실적이며, 특히 반자느가라 지역의 성장 가능성을 염두에 두고 전략을 모색해볼 수 있다는 방향성이 제시되었다.</p><p>다시, 디엥 고원(Dieng Plateau)에 대해서는 이야기를 했다. 따리오노에 따르면 디엥 지역은 바닐라 빈, 두리안, 코코 등 다양한 품목이 동시에 존재하는 복합 생산지이며, 디엥과의 커넥션을 확보하는 것이 전략적으로 유의미할 수 있다고 보았다. 특정 단일 품목에 의존하기보다, 여러 고부가가치 작물이 공존하는 지역 기반 네트워크를 구축하는 것이 더 안정적일 수 있다는 설명이 이어졌다.</p><p>반면, 메노레(Menoreh) 지역에도 바닐라 빈 생산이 있기는 하나, 주로 집 근처에서 소규모로 재배하는 소농 중심 구조라고 설명했다. 이 경우 생산 규모가 작고 표준화가 부족해 품질을 안정적으로 보장하기 어렵다는 뜻이었다. 즉, 단순히 생산 여부보다도 품질 관리와 유통 안정성이 더 중요하다는 점을 암묵적으로 강조…한 것으로 보인다.</p><p></p>	📝	\N	root.49ef1df9_b305_4e9e_9c16_83eeb41db1fa	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-13 05:20:55.456973+00	2026-02-14 01:21:17.091049+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	5	레프 리포트
116ba483-8ecc-49ad-bd5d-d1f5e21c3718	ㅇㅇㅇ	<p>헬로우 </p><p></p><p>재밌는</p><p></p><p>테스트</p><p></p>	\N	\N	root.116ba483_8ecc_49ad_bd5d_d1f5e21c3718	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 06:53:36.892714+00	2026-02-08 06:53:53.843893+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 06:53:53.843893+00	5	\N
337b95aa-d9c5-45b5-818e-d9c30d6828ee	ㅇㅇㅇㅇ	<p>ㅇㅇㅇ아이이</p>	\N	\N	root.337b95aa_d9c5_45b5_818e_d9c30d6828ee	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 01:47:51.919717+00	2026-02-08 06:55:40.804671+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 06:55:40.804671+00	2	\N
0d5c4a27-3259-43c2-8281-77e434a816d5	ㅇㅇ	<p>ㅌ엑슴늘</p><p></p><p></p>	\N	\N	root.0d5c4a27_3259_43c2_8281_77e434a816d5	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 06:39:56.32604+00	2026-02-08 06:55:43.596159+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 06:55:43.596159+00	3	\N
b565db23-a172-44ea-bc66-1dc321403569	테스트	<p>개선사항들</p><p></p>	\N	\N	root.b565db23_a172_44ea_bc66_1dc321403569	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 06:49:28.346149+00	2026-02-08 06:55:46.654689+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 06:55:46.654689+00	4	\N
e8287c56-68c3-4c91-bcf9-ee49de19c466	헬로우	<p>안녕</p><p></p>	\N	\N	root.e8287c56_68c3_4c91_bcf9_ee49de19c466	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 07:10:27.351249+00	2026-02-08 07:11:25.572719+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 07:11:25.572719+00	7	\N
38d49313-4f60-437a-90aa-3d6ad08115ed	hello3	<p><strong>안녕</strong></p><p></p>	\N	\N	root.38d49313_4f60_437a_90aa_3d6ad08115ed	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 11:07:47.96744+00	2026-02-08 11:08:27.036285+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 11:08:27.036285+00	5	메뉴
606bcd9e-c688-4292-8cd1-d1953ffb0e55	hello2	<p><strong>재밌네</strong></p><p></p>	\N	\N	root.606bcd9e_c688_4292_8cd1_d1953ffb0e55	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 11:07:38.450046+00	2026-02-08 11:08:28.891576+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 11:08:28.891576+00	4	메뉴
b61a8fc4-acb7-4b65-ae8a-bb4ebd96fd05	hello		\N	\N	root.b61a8fc4_acb7_4b65_ae8a_bb4ebd96fd05	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 11:07:30.844593+00	2026-02-08 11:08:31.411996+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 11:08:31.411996+00	3	\N
5f44496f-bac4-4d26-9cd6-d6848293882d	Cotion 개선사항		\N	\N	root.5f44496f_bac4_4d26_9cd6_d6848293882d	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 07:16:42.577614+00	2026-02-08 07:24:42.026675+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 07:24:42.026675+00	7	운영
8158ac55-c831-4e7a-9dfa-ba6e98558ce0	Cotion 개선사항	<ul><li><p>키워드 검색 기능 추가하기</p></li><li><p></p></li></ul>	\N	\N	root.8158ac55_c831_4e7a_9dfa_ba6e98558ce0	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 06:54:04.410136+00	2026-02-08 07:25:07.042361+00	1aa200d8-e514-4484-87c1-89cb3991302b	t	2026-02-08 07:25:07.042361+00	5	운영
a282f904-b63a-4443-bafc-c386b05e962a	Coffee Community 개선사항	<p></p><p>Coffee Community 개선사항 쭉~ 편하게 작성해주세요.</p><p></p><ul><li><p>검색 기능 추가</p></li><li><p>카테고리 - 리뷰 작성시 머릿말에 &lt;카페&gt;, &lt;원두&gt; 와 같은 머릿말(주제) 추가</p></li></ul>	\N	\N	root.a282f904_b63a_4443_bafc_c386b05e962a	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-08 10:51:41.895686+00	2026-02-09 05:37:37.740853+00	c4f7b435-d12b-4f1f-a637-5be93662a052	f	\N	2	운영
ef698f6a-3aae-4818-8859-3efa94d784e5	커피 농장 초도물량		\N	\N	root.ef698f6a_3aae_4818_8859_3efa94d784e5	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-11 13:00:13.959591+00	2026-02-11 13:00:13.96362+00	1aa200d8-e514-4484-87c1-89cb3991302b	f	\N	4	인도네시아 방문 2월
540bcdf0-9f2a-43fa-913e-d1baee0afebb	인도네시아 방문 후기, 피드백	<ul><li><p>트라주마스 100키로 초도 물량 수입 예정</p></li><li><p>2월 말쯤 발송 가능하다고 말함</p></li><li><p>가격에 대해서는 아직 미언급.</p></li></ul><p></p><p></p><p></p><p></p>	\N	\N	root.540bcdf0_9f2a_43fa_913e_d1baee0afebb	\N	1aa200d8-e514-4484-87c1-89cb3991302b	2026-02-09 05:37:27.565261+00	2026-02-11 13:18:34.221544+00	1aa200d8-e514-4484-87c1-89cb3991302b	f	\N	3	인도네시아 방문 2월
b5f5649c-a2e6-4cac-bdc1-36e142d43f39	카일라사(바바단, 투르노)	<h1>1. 카일라사 산지 답사 개요</h1><p>방문일: 2026.2.12<br>방문지: 카일라사 (Babadan, Central Java)</p><p>운영 주체: Pak Turno, Ibu Ayu</p><p>지역 특성: 디엥 고원지대, 해발 1100–1400m (아라비카 재배 구간)</p><hr><h1>2. 성장 단계 및 외부 지원</h1><p>성장 단계: 소규모 산지 기반 운영 단계</p><p>정부 지원 여부: 있음. Bank Indonesia로부터 일부 시설 투자 지원을 받은 것으로 보임.</p><p>*그러나 초기 투자만 이루어진 것 같기도 하고...</p><p>지원 결과: 가공 설비 일부 확충</p><p><strong>평가: 공공기관 지원을 통한 설비 보완 단계. 다만 대규모 확장 단계는 아님.</strong></p><hr><h1>3. 가공 및 품질 관리 설비</h1><p>1차 및 등급 분류:<br>반기계식 스크리닝 설비 보유. 기본 등급 분류 가능.</p><p>가공 방식:<br>풀 워시(full wash) 가능.<br>**아유타에서는 내추럴만 주문.</p><p><strong><br>기초 가공 인프라는 확보되어 있으나, 대량 처리 설비는 아님.<br>프로세싱 선택권은 존재.</strong></p><hr><h1>4. 생산 규모 및 공급 구조</h1><p>연간 물량 (2026 기준):</p><p>전체 유통 물량은 정확히 공개 X</p><p>수출할 수 있는 물량은 아라비카 1톤 이하<br>로부스타는 그보다 훨씬 소량</p><p></p><p>수확 시기: 3–4월</p><p>출고 구조: 수확 이후 약 2개월 보관 과정을 거친 뒤 발송 가능</p><hr><h1>5. 재배 구조</h1><p>재배 방식: 분산형 소농 구조<br>지역 내 소규모 농가 네트워크 기반 운영</p><hr><h1>6. 재배 환경</h1><p>해발 1100–1400m<br>고지대 아라비카 적합 구간</p><hr><h1>7. 전략적 평가</h1><p>강점:</p><ul><li><p>고지대 아라비카 생산 가능</p></li><li><p>수확 시기 메노레와 상이 (리스크 분산 가능)</p></li><li><p>프로세싱 선택 가능</p></li><li><p>Bank Indonesia 지원 이력</p></li></ul><p>약점:</p><ul><li><p>연간 물량 매우 제한적</p></li><li><p>대량 확장 구조 아님</p></li><li><p>운송 비용</p></li></ul><p><strong><br>카일라사는 “소량 고지대 프리미엄 오리진” 포지션에 적합<br>대량 상업 공급지보다는 시그니처 산지 전략이 유효</strong></p>	\N	\N	root.b5f5649c_a2e6_4cac_bdc1_36e142d43f39	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-14 01:11:18.426881+00	2026-02-22 00:55:47.531622+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	9	산지 실사 기록
11dc952e-84f9-4b55-b027-08ed88bbaea8	현금 키오스크	<h2>현금 키오스크 </h2><p>브링스 인도네시아(Brink's Indonesia)</p><p>Bhima Respati (카리나 계부, 브링스 임원)</p><p></p><h3>1. 요청사항</h3><p>1-1. 멀티 결제: 현금 / 카드 / QR</p><p>1-2. 지폐 수용 20,000장 필요 (잦은 보충을 피하기 위함)</p><p>1-3. 초기 물량 250-300대, 6000불 이하 </p><h3>2. 핵심 이슈</h3><p>2-1. 인니는 현금 사용 비율 높음. 삥땅도 많이 치는 게 문제인듯</p><p>2-2. 대용량 지폐 적재 가능한 구조 필요 (커스터마이징 가능 여부 핵심)</p><p></p><h3>3. 현재 진행</h3><p>3-1. 한국 키오스크 업체 조사 중 (황명화, 2.26 요청)</p><p></p>	\N	\N	root.11dc952e_84f9_4b55_b027_08ed88bbaea8	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-26 06:49:21.553186+00	2026-02-26 07:02:08.297484+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	16	아유타상사 아이템 아카이브
9eb7dd6b-f957-44fc-8175-11ec0bf1a100	2026.2.11 띠오네 방문	<p>2026.2.11</p><p><strong>트레주마스(메노레) 티오네 방문 </strong></p><p></p><p>티오네 트레주마스는 현재 가시적인 성장 국면에 들어선 것으로 보인다. 최근 정부 투자 유치에 성공하여 복수의 지원을 확보하였고, 이를 기반으로 생산 및 가공 시설 확장을 진행하였다.</p><p></p><p>특히 주목할 점은 생두 선별용 수조(wet sorting tank)를 새로 도입한 것이다. 이는 1차 품질 관리 단계에서 밀도 선별을 체계화할 수 있는 기반을 마련했다는 점에서 의미가 있다. 다만 건조 이후의 최종 선별 공정은 아직 수작업 핸드픽(hand-picking)에 의존하고 있으며, 향후 스크리닝 기계(기계식 등급 분류 설비)를 도입할 계획이라고 밝혔다. 즉, 현재는 부분적 기계화 단계에 있으며, 중장기적으로는 선별 공정의 자동화 및 표준화를 지향하는 구조로 이해된다.</p><p></p><p>현재 연간 처리 물량은 약 18톤 수준이다. 이는 소규모 농가 단위를 넘어 일정한 상업적 규모를 갖춘 단계로 볼 수 있으나, 급격한 물량 확대를 감당할 수 있는 구조는 아니다.</p><p></p><p>우리는 2월 말 100kg을 1차 주문하였으며, 이후 6–8주 내 추가로 1톤을 주문하고자 한다는 의사를 전달하였다. 그러나 수확 시기가 9–11월로 연 1회에 한정되어 있고, 생산 구조 또한 단일 수확 주기에 의존하고 있기 때문에, 추가 주문이 가능하더라도 약 1톤 수준이 현실적 한계라고 설명하였다. 즉, 현 단계에서 티오네의 생산 구조는 안정적이되, 탄력적 대량 공급 체계는 아직 갖추지 못한 상태로 판단된다.</p><p></p><p>재배 및 관리 품목은 아라비카, 로부스타, 리베리카 세 종이며, 세 품종 모두에 지속적으로 투자를 이어가고 있다고 한다. 품종 다각화 전략을 유지하는 것으로 보인다.</p><p></p><p>다만 재배 고도는 약 600–700m 수준으로, 이는 일반적으로 고지대 아라비카의 풍미 특성을 기대하기에는 다소 낮은 구간이다. 실제로 아라비카의 경우 산미가 존재한다고 언급되었으나, 해당 고도 조건에서 형성되는 산미의 구조와 컵 프로파일에 대해서는 별도의 관능 평가 및 샘플 테스트를 통한 검증이 필요하다.</p><p></p><p>최근 상당한 규모의 신규 식재를 진행하였으며, 추가 식재가 가능한 유휴 토지도 아직 남아 있다고 밝혔다. 이는 중장기적으로 생산량 확대 가능성이 존재함을 의미한다. 다만 식재 이후 수확까지의 시간 지연을 고려할 때, 단기 물량 증가는 제한적일 것으로 예상된다.</p>	📝	\N	root.9eb7dd6b_f957_44fc_8175_11ec0bf1a100	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-13 13:07:30.013176+00	2026-02-14 00:46:33.913624+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	6	레프 리포트
9b9bf442-3ef2-4e87-b86f-8d19215e2f89	트라주마스(메노레, 티오)	<h2>1. 메노레 산지 답사 개요</h2><ul><li><p><strong>방문일</strong>: 2026.2.11</p></li><li><p><strong>방문지</strong>: 트라주마스(메노레)</p></li><li><p><strong>대표/운영자</strong>: 마스 티오(Tio)</p></li><li><p><strong>지역 특성</strong>: 메노레 구릉지대</p></li></ul><hr><h2>2. 성장 단계 및 외부 지원</h2><ul><li><p><strong>성장 단계</strong>: 확장 국면 진입</p></li><li><p><strong>정부 지원 여부</strong>: 있음 (투자 유치 성공)</p></li><li><p><strong>지원 결과</strong>: 시설 확장 진행</p></li></ul><p><strong>평가:</strong><br>정부 자금 기반의 구조 확장 단계. 재정적 안정성은 비교적 양호해 보임.</p><hr><h2>3. 가공 및 품질 관리 설비</h2><h3>(1) 1차 선별</h3><ul><li><p>생두 선별용 수조(wet sorting tank) 보유</p></li><li><p>밀도 기반 선별 가능</p></li></ul><h3>(2) 건조 이후 선별</h3><ul><li><p>현재: 핸드픽(hand-picking)</p></li><li><p>계획: 스크리닝 기계 도입 예정</p></li></ul><p><strong>가공 단계 평가:</strong><br>부분 기계화 단계.<br>완전 자동화는 아님.<br>표준화 전환 과정에 있음.</p><hr><h2>4. 생산 규모 및 공급 구조</h2><ul><li><p><strong>연간 처리 물량</strong>: 약 18톤</p></li><li><p><strong>수확 시기</strong>: 9–11월</p></li><li><p><strong>수확 횟수</strong>: 연 1회</p></li></ul><h3>아유타 주문 현황</h3><ul><li><p>1차 주문: 100kg (2월 말)</p></li><li><p>추가 희망: 1톤 (6–8주 내)</p></li></ul><h3>산지 측 응답</h3><ul><li><p>이후 추가 주문 가능 물량: 약 1톤 한계</p></li><li><p>단기간 탄력적 물량 증대 어려움</p></li></ul><p><strong>공급 안정성 평가:</strong></p><ul><li><p>소규모 상업 단계</p></li><li><p>대량 주문 대응력 낮음</p></li><li><p>단기 확장성 제한적</p></li><li><p>리베리카 샘플 미보유 </p></li></ul><hr><h2>5. 재배 품종</h2><ul><li><p>아라비카</p></li><li><p>로부스타</p></li><li><p>리베리카</p></li></ul><p><strong>*</strong>품종 다각화 유지 전략으로 판단됨</p><hr><h2>6. 재배 환경</h2><ul><li><p>해발고도: 약 600–700m</p></li><li><p>아라비카: 산미 존재 언급</p></li></ul><hr><h2>7. 확장 가능성</h2><ul><li><p>최근 신규 식재 진행</p></li><li><p>추가 식재 가능 토지 존재</p></li></ul><p><strong>전망:</strong></p><ul><li><p>중장기 생산량 증가 가능</p></li><li><p>그러나 여전히 단기 물량 증대는 어려움 (식재-수확 시간차 존재)</p></li></ul>	\N	\N	root.9b9bf442_3ef2_4e87_b86f_8d19215e2f89	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-14 00:51:13.441104+00	2026-02-14 01:07:42.918906+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	8	산지 실사 기록
db65b91e-321b-4063-a41c-7c7b6a5a2295	견적송장(Proforma Invoice)	<p><strong>1. 개요</strong></p><p>&nbsp;</p><p>매매계약 성립 이전에 수출자가 수입자에게 제시하는 거래물품 가격 계산자료이다. 견적송장도 계약의 주요내용을 포함하고 있고, 수출자의 제안에 수입자가 승낙하면 계약서로서 효력을 가진다.</p><p>무역계약은 불요식 계약으로서 일정한 형식에 구애되지 않는다. 따라서 구두, 서면에 구애받지 않고 Offer나 Order이든 또는 Proforma Invoice이든 확정적인 의사표시로서 이에 대해 상대방이 승낙하면 계약이 성립된다.</p><p>&nbsp;</p><p><strong>2. 견적송장의 작성</strong></p><p>&nbsp;</p><p>특별한 형식이 정하여진 것은 아니며 기업마다 사용하는 양식에는 다소 차이가 있으나 기본적으로 들어가는 내용은 동일하다. 여기에는 품명, 규격, 수량, 단가, 금액, 대금결제조건, 선적방법 등이 기재된다.</p><p></p><p>출처: <a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://www.kita.net/board/format/formatDetail.do?postIndex=1863877">https://www.kita.net/board/format/formatDetail.do?postIndex=1863877</a></p>	📝	\N	root.db65b91e_321b_4063_a41c_7c7b6a5a2295	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-26 09:49:39.567653+00	2026-02-26 09:51:33.790547+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	18	열람 자료
a6b8e7ac-ed7a-4154-8911-f35b256ade85	상업송장(Commercial Invoice)		\N	\N	root.a6b8e7ac_ed7a_4154_8911_f35b256ade85	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-26 09:52:30.761153+00	2026-02-26 09:52:49.941634+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	t	2026-02-26 09:52:49.941634+00	19	열람 자료
f6ab2ab1-0fbe-4019-ad6d-e88e3b87ea4b	상업송장(Commercial Invoice)	<p><strong>상업송장(Commercial Invoice)</strong></p><p></p><p><strong>1. 개요</strong></p><p>&nbsp;</p><p>송장은 매도인이 매수인 앞으로 작성해 보내는 선적화물의 내용명세서로 계산서 및 청구서 역할을 하는 서류이며, 수출상이 매매계약의 조건을 적합하게 이행하였음을 수입상에게 증명하는 서류이다. 상거래상 선하증권과 함께 필수적인 선적서류로 사용된다.&nbsp;</p><p>국내 상거래에 이용되는 송장은 단순히 물품의 적요서나 안내장의 역할을 하지만 국제무역거래의 경우에는 적요서나 안내장의 역할 뿐만 아니라 매매당사자의 이름과 주소, 발행일자, 주문번호, 계약물품의 규격 및 개수, 포장상태 및 화인 등이 표시된 구체적인 매매계산서인 동시에 대금청구내역서이기도 한다.</p><p>또한, 송장은 무역거래상의 필수서류로 모든 신용장에서 요구하고 있으나 유가증권인 선하증권이나 보험증권과 같이 그 자체가 청구권이 있는 서류는 아니다. 이러한 성격으로 경우에 따라서는 해당 거래계약의 존재 및 계약이행의 사실을 입증하는 자료가 되며, 수입물품의 정확성 및 진실성을 입증하기 위한 세관신고의 증명자료가 되기도 한다.</p><p>&nbsp;</p><p><strong>2. 송장의 기능에 따른 작성</strong></p><p>&nbsp;</p><p>상업송장(Commercial Invoice)의 형식은 국가마다 또는 회사마다 다를 수 있지만, 일반적으로 유사한 유형의 정보를 포함한다.</p><p>&nbsp;</p><p>&nbsp;1) 선적물품 명세서</p><p>&nbsp; &nbsp;송장은 선적물품에 대한 명세서 역할을 한다. 따라서 기재사항에서는 물품의 명칭, 종류, 품질, 화인, 수량, 중량, 용적, 단가, 총금액, 송하인, 수하인, 기타 물품매매에 필요한 사항을 모두 기재해야 한다.</p><p>&nbsp;</p><p>&nbsp;2) 매매물품의 계산서 및 대금청구내역서</p><p>&nbsp; &nbsp;송장은 매매되는 물품의 계산서 및 대금청구서 역할을 한다. 송장상의 금액은 수출금액을 표시하므로 환어음(Bill of Exchange)의 발행금액과 일치하여야 한다. 또한, 추심결제방식인 D/P 및 D/A조건에서는 송장 자체가 대금지급청구내역서의 역할을 하게 된다.</p><p>&nbsp;</p><p>&nbsp;3) 무역금융 담보물 명세서</p><p>&nbsp; &nbsp;송장은 무역금융에서 담보물의 명세를 밝히는 중요한 서류이다. 수출업자가 발행하는 환어음을 매입은행이 매입할 때나 수입지 거래은행이 수입업자에게 화물대도(Trust Receipt : T/R)를 통해 화물을 인도할 때에도 운송서류에는 송장이 필히 포함되어야 한다.</p><p>&nbsp;</p><p>&nbsp;4) 과세가격산정 기준서류</p><p>&nbsp; &nbsp;송장은 수입자에게 화물수령 안내서가 되고 수입지 세관에서는 과세가격산정에 필수서류가 되고 있다. 종가세(Ad Valorem Duties)가 적용되는 화물일 때는 송장금액이 과세가격 산정의 기준이 되고 종량세(Specific Duties)가 적용되는 경우에는 송장에 명시된 수량, 중량, 용적에 따라 관세가 정해지므로 송장에 기재되는 가격이나 수량 등은 정확하게 기재하여야 한다.</p><p></p><p>출처: <a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://www.kita.net/board/format/formatDetail.do?postIndex=1863897">https://www.kita.net/board/format/formatDetail.do?postIndex=1863897</a></p>	📝	\N	root.f6ab2ab1_0fbe_4019_ad6d_e88e3b87ea4b	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-26 09:53:12.427699+00	2026-02-26 09:54:01.519674+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	19	열람 자료
89ccdf2c-18fc-4278-a1f7-aea54ec165cc	1. 스페이스 로스터리		📌	\N	root.89ccdf2c_18fc_4278_a1f7_aea54ec165cc	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-16 00:17:56.031582+00	2026-02-16 00:18:13.511454+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	t	2026-02-16 00:18:13.511454+00	12	아유타 인스타그램 카페 콘텐츠
768215d3-54d2-4842-8a6f-1cb793ec9937	2. 피투투르 코피	<p>[족자, 카페] 피투투르 코피</p><p>Pitutur Kopi</p>	\N	\N	root.768215d3_54d2_4842_8a6f_1cb793ec9937	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-16 00:19:38.273147+00	2026-02-16 00:20:50.425979+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	12	아유타 인스타그램 포스팅
8d56fd01-296d-4154-a664-f46051b308f7	0. 인스타그램 운영 기획	<ol><li><p>아유타상사로 인스타그램 이름 변경 (2026.2.15)</p></li></ol><p>-&gt; @ayutatradingco</p><p>-&gt;<strong> (주)아유타상사</strong><br>설명: 자바섬을 기반으로 한국–인도네시아 간 수출입 및 유통을 진행합니다.</p><p>Perusahaan perdagangan Korea–Indonesia</p><p>Berbasis di Pulau Jawa, menangani ekspor–impor dan distribusi.</p><p>-&gt; 아유타 로고 수정(태인) 완료</p><p></p><ol start="2"><li><p>첫 포스팅 글 작성</p></li></ol><p>-&gt; 마스 레프, 마스 코피, 마스 바닐라</p><p>-&gt; 마스 코피, 마스 바닐라는 도트 캐릭터로 구성?</p><p>-&gt; 내용: 자바섬을 기반으로 한국과 인도네시아를 연결하는 수출입, 유통, 현지 협업을 진행합니다. 양국 모두에 도움이 되는 지속 가능한 무역을 추구합니다. </p><p></p><p>*큐레이팅 족자 - 테오화랑 스토리 리그램</p><p>**족자 및 자바 카페 소개</p><p>2-1. 그 외 지역 카페는 모두 스토리로 -&gt; 하이라이트</p><p>-&gt; 특별히 좋았거나, 한 명이라도 좋았다고 느끼는 곳만 포스팅하면 어떨지?</p><p>-&gt; 그럼 굳이 평가를 넣거나 하지 않아도 자연스레 보증..? 하는 느낌</p><p></p><ol><li><p>산지 콘텐츠 (티오, 카일라사 등)</p></li></ol><p></p><ol><li><p></p></li><li><p></p></li></ol>	\N	\N	root.8d56fd01_296d_4154_a664_f46051b308f7	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-15 11:37:09.432198+00	2026-02-16 01:31:19.160765+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	11	아유타 인스타그램 포스팅
1221c4fc-ddfb-42e1-997b-6f384b1d07a8	자료자료	<p>코코아 현재 상황(26.02.12. 기사)</p><p>https://m.newsmaker.or.kr/news/articleView.html?idxno=174315</p><p>국내 코코아 동향 (26.02.02. 기사)</p><p><a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://n.news.naver.com/article/366/0001139918?sid=101">https://n.news.naver.com/article/366/0001139918?sid=101</a></p><p>최근 국제적으로 코코아 가격이 하락했음에도 불구</p><p>국내는 현재 두쫀쿠 영향으로 수요보다 공급이</p><p>부족한 상황으로 판매 가격이 높음</p><p></p><p>-</p><p>인도네시아 바닐라빈 수입 참고 자료</p><p><a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://langitnusa.tistory.com/m/5">https://langitnusa.tistory.com/m/5</a></p><p>인도네시아 바닐라빈 타 업체 수입 정보</p><p><a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://langitnusa.tistory.com/m/2">https://langitnusa.tistory.com/m/2</a></p><p>바닐라빈 수입시 유의할 점</p><p><a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://langitnusa.tistory.com/m/15">https://langitnusa.tistory.com/m/15</a></p><p>위 세 개 링크는 동일한 블로그</p><p>인도네시아 바닐라빈을 수입, 판매 중이며</p><p>참고하기 좋음.</p><p>모두 25년 7월 작성</p><p></p><p>바닐라빈 판매 루트</p><ul><li><p>네이버 스토어 팜</p></li><li><p>베이커리, 디저트 카페 커뮤니티를 통한 판매</p></li><li><p>가장 유명한 곳은 오븐엔조이(스토어팜, 카페)</p><p><br></p></li></ul><p></p><p></p><p></p><p></p>	📌	\N	root.1221c4fc_ddfb_42e1_997b_6f384b1d07a8	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-13 13:34:27.324749+00	2026-02-15 03:21:09.30261+00	c4f7b435-d12b-4f1f-a637-5be93662a052	f	\N	7	열람 자료
2066738e-079a-4c9c-b2e4-f5b2bb07ea7c	1. 스페이스 로스터리 1890	<p>[족자, 카페] 스페이스 로스터리 1890</p><p>Space Roastery 1890 </p><p></p>	\N	\N	root.2066738e_079a_4c9c_b2e4_f5b2bb07ea7c	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-15 09:09:06.812331+00	2026-02-15 11:36:43.772014+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	10	아유타 인스타그램 포스팅
9330f2ab-d6c9-468a-ac02-cf327d8defc2	2월	<p>사업자 등록 이후 </p><p></p><p>1. 법인 계좌</p><p>2. 법인 외화계좌</p><p></p><p><strong>3. 서류 양식(필수) 갖춰야할 것 </strong></p><p><strong>3-1. 기본 견적서(Quotation)</strong></p><p>*세부: 회사 로고, 제품명, 단가, Incoterms(FOB/CIF), 유효기간, 서명</p><p><strong>3-2. 수출입용 인보이스</strong></p><p>: 견적송장(Proforma Invoice), 상업송장(Commercial Invoice)</p><p> *KITA 한국무역협회 <a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://www.kita.net/board/format/formatMain/formatList.do">https://www.kita.net/board/format/formatMain/formatList.do</a> 서식 참조해서 만들면 될 것 같음</p><p><strong>3-3. 포장명세서(Packing List)</strong></p><p>*물류, 통관용</p><p>**<a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://www.kita.net/board/format/formatDetail.do?postIndex=1863940">https://www.kita.net/board/format/formatDetail.do?postIndex=1863940</a></p><p><strong>3-4. 물품매매계약서(Sales Contract 또는 Purchase Contract)</strong></p><p>*분쟁방지 = 리스크 관리용 </p><p>**<a target="_blank" rel="noopener noreferrer" class="text-blue-600 underline cursor-pointer" href="https://www.kita.net/board/format/formatDetail.do?postIndex=1863890">https://www.kita.net/board/format/formatDetail.do?postIndex=1863890</a></p><p></p><ol start="4"><li><p>내부 자료</p></li></ol><p>4-1. 회사 소개서(Company Profile)</p><p>4-2. 커피 및 물품 정보 상세페이지? </p><p>4-3. 은행 관련 서류 </p><p></p><p>5. 포워더/관세사</p><p></p><p>6. 웹사이트? - 필요하긴 할 것 같음 </p><p>7. 명함</p><p></p><p>FOB 견적에 아래가 포함되어 있는지 확인 필요:</p><ol><li><p>인도네시아 내 운송비 (농가 → 항구*, 이거 명확히 확인 필요)</p></li><li><p>포장비</p></li><li><p>수출 통관 비용</p></li><li><p>THC (Terminal Handling Charge)</p></li><li><p>서류 발급 비용</p><p></p></li></ol><p>FOB 이후 발생 비용:</p><ol><li><p>해상운임 </p></li><li><p>해상 보험</p></li><li><p>한국 통관비</p></li><li><p>검역/식품 검사 비용</p></li><li><p>관세 (FTA 여부 확인 필요)</p></li><li><p>국내 내륙 운송</p></li><li><p>창고료</p></li></ol><p></p><p>최종 도착 원가: FOB + 운임 + 보험 + 통관 + 국내비용</p><p></p><p><strong>*그 외 업무 효율을 위한 코션 개선,</strong></p><p><strong>업무 진행상황 공유(카톡, 구두 전달만으로는 확실히 무리가 있음)</strong></p>	\N	\N	root.9330f2ab_d6c9_468a_ac02_cf327d8defc2	\N	9bb010bc-7729-4fd1-9fa4-e58d13a963da	2026-02-26 07:50:04.101065+00	2026-02-27 06:27:09.107964+00	9bb010bc-7729-4fd1-9fa4-e58d13a963da	f	\N	17	아유타상사 체크리스트
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, refresh_token, expires_at, created_at, ip_address, user_agent) FROM stdin;
4735c84b-c05e-4bc4-8133-22664facf467	9bb010bc-7729-4fd1-9fa4-e58d13a963da	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5YmIwMTBiYy03NzI5LTRmZDEtOWZhNC1lNThkMTNhOTYzZGEiLCJlbWFpbCI6ImF5dXRhM0BheXV0YS5jb20iLCJyb2xlIjoibWVtYmVyIiwiaWF0IjoxNzcxNzIxNjgwLCJleHAiOjE3NzIzMjY0ODB9.zsAU9eSKRYsWS0xWgTfhHCm7DDlcJa0QEYlrwyPbZjM	2026-03-01 00:54:40.456+00	2026-02-22 00:54:40.457577+00	\N	\N
a57a77aa-86b6-4287-892b-97d28bb5edaf	1aa200d8-e514-4484-87c1-89cb3991302b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxYWEyMDBkOC1lNTE0LTQ0ODQtODdjMS04OWNiMzk5MTMwMmIiLCJlbWFpbCI6ImF5dXRhMUBheXV0YS5jb20iLCJyb2xlIjoibWVtYmVyIiwiaWF0IjoxNzcxODM4MjU5LCJleHAiOjE3NzI0NDMwNTl9.e1AkFivNVpli64AczmhhUa2cJQ8oTdf41XGcNYxF_Js	2026-03-02 09:17:39.912+00	2026-02-23 09:17:39.912622+00	\N	\N
b5690e8c-4371-4948-88cf-a022f656e338	c4f7b435-d12b-4f1f-a637-5be93662a052	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjNGY3YjQzNS1kMTJiLTRmMWYtYTYzNy01YmU5MzY2MmEwNTIiLCJlbWFpbCI6ImF5dXRhMkBheXV0YS5jb20iLCJyb2xlIjoibWVtYmVyIiwiaWF0IjoxNzcyMDg2NDU5LCJleHAiOjE3NzI2OTEyNTl9.-vUbowcWujrnthexdLTDtN7MFg9Fpanm2V1J01woStk	2026-03-05 06:14:19.089+00	2026-02-26 06:14:19.087957+00	\N	\N
269ff38f-727b-4b52-832a-8d7da11211a2	9bb010bc-7729-4fd1-9fa4-e58d13a963da	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5YmIwMTBiYy03NzI5LTRmZDEtOWZhNC1lNThkMTNhOTYzZGEiLCJlbWFpbCI6ImF5dXRhM0BheXV0YS5jb20iLCJyb2xlIjoibWVtYmVyIiwiaWF0IjoxNzcyMDg2NTQ4LCJleHAiOjE3NzI2OTEzNDh9.mgVaontpqYaZKHG2cG5_Dh3jCLi169k6NUqVRvlXwco	2026-03-05 06:15:48.976+00	2026-02-26 06:15:48.974573+00	\N	\N
a60c7fa8-c9fa-45c8-9ab1-51a3b75841b4	1aa200d8-e514-4484-87c1-89cb3991302b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxYWEyMDBkOC1lNTE0LTQ0ODQtODdjMS04OWNiMzk5MTMwMmIiLCJlbWFpbCI6ImF5dXRhMUBheXV0YS5jb20iLCJyb2xlIjoibWVtYmVyIiwiaWF0IjoxNzcyMTA0MDE2LCJleHAiOjE3NzI3MDg4MTZ9.KLAEQLISIdh_lbpsl0zVViEkeCrwUwuphvQJCCBvCvU	2026-03-05 11:06:56.03+00	2026-02-26 11:06:56.031472+00	\N	\N
197852a0-3d93-43e6-9add-15d67fe38a2d	1aa200d8-e514-4484-87c1-89cb3991302b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxYWEyMDBkOC1lNTE0LTQ0ODQtODdjMS04OWNiMzk5MTMwMmIiLCJlbWFpbCI6ImF5dXRhMUBheXV0YS5jb20iLCJyb2xlIjoibWVtYmVyIiwiaWF0IjoxNzcyMTA0MDYwLCJleHAiOjE3NzI3MDg4NjB9.XvIZviUe9X0fVgpFWkhJq89gWVoIEoJR5pskbT38wGg	2026-03-05 11:07:40.047+00	2026-02-26 11:07:40.047862+00	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, name, avatar_url, role, created_at, updated_at, last_login_at, username) FROM stdin;
c4f7b435-d12b-4f1f-a637-5be93662a052	ayuta2@ayuta.com	$2b$12$OJY8gfyI5zGKoNhPl3ElH.cIqO1Ruz9cWGV9I7NEBp4e0Scp5RBte	Ayuta 2	\N	member	2026-02-08 11:49:40.187171+00	2026-02-26 06:14:19.083231+00	2026-02-26 06:14:19.083231+00	ayuta2
9bb010bc-7729-4fd1-9fa4-e58d13a963da	ayuta3@ayuta.com	$2b$12$GFR4qiBAyOvMPBDXE5r5m.ZVlSQjz5w3eAPvHip9X25eweUmeaeIu	Ayuta 3	\N	member	2026-02-08 11:50:21.152767+00	2026-02-26 06:15:48.970947+00	2026-02-26 06:15:48.970947+00	ayuta3
1aa200d8-e514-4484-87c1-89cb3991302b	ayuta1@ayuta.com	$2b$12$9hfZjfALrFkkqIULzin3Xu5IfuKcH9fCVT1CRwu5pWYuh0zwwnckq	Ayuta 1	\N	member	2026-02-08 01:31:58.682419+00	2026-02-26 11:07:40.042925+00	2026-02-26 11:07:40.042925+00	ayuta1
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 5, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_refresh_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_refresh_token_unique UNIQUE (refresh_token);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: idx_pages_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_category ON public.pages USING btree (category);


--
-- Name: idx_pages_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_created_by ON public.pages USING btree (created_by);


--
-- Name: idx_pages_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_parent_id ON public.pages USING btree (parent_id);


--
-- Name: idx_pages_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_path ON public.pages USING gist (path);


--
-- Name: idx_pages_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_updated_at ON public.pages USING btree (updated_at);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_refresh_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_refresh_token ON public.sessions USING btree (refresh_token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: pages update_pages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pages pages_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pages pages_parent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: pages pages_updated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict QmbipvpcJ0DUMHbf3h2fRBgZCXuATReYEiFrSBc8U0uN78u1Zp5apJKNOSFChN8

