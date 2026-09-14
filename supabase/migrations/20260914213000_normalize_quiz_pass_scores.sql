begin;

-- Eski kayıtlarda soru sayısının yanlışlıkla yüzde geçme puanı olarak
-- saklanmış olabileceği değerleri, ürünün asgari quiz barajına çevirir.
update public.journey_worlds
set quiz_pass_score = 60
where quiz_pass_score < 60;

alter table public.journey_worlds
  drop constraint if exists journey_worlds_quiz_pass_score_check;

alter table public.journey_worlds
  add constraint journey_worlds_quiz_pass_score_check
  check (quiz_pass_score between 60 and 90);

commit;
