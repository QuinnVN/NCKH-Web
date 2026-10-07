# DESMAP assessment

This context defines the career-assessment language shared by the questionnaire, career results, and later VR evaluation.

## Language

**Initial assessment**:
A questionnaire-only interpretation of a participant's self-reported DESMAP profile, with exploratory career directions. It is produced before any VR telemetry exists.
The validated AI result is cached in browser sessionStorage and stored in the MongoDB questionnaire submission as `initialEvaluation` after the submission is synchronized.
_Avoid_: Final assessment, career recommendation

**Final assessment**:
A completed assessment that combines a participant's questionnaire submission with observed evidence from VR telemetry. It is available only when both records belong to the same assessment.
_Avoid_: Initial assessment, questionnaire result

**Career interest**:
A broad field selected by a participant before answering the questionnaire. It determines career candidates for a provisional match comparison and limits initial and final career suggestions to the selected fields, unless the participant is exploring.
_Avoid_: Career, career match

**Career candidate**:
An available career selected for a provisional match comparison through the participant's career interests.
_Avoid_: Career interest, recommended career

**Initial career match**:
A provisional percentage comparing a participant's self-reported grouped DESMAP scores with one career candidate's adjustable criteria. It is not a personal strength assessment or a career recommendation.
_Avoid_: Strength, gap, final assessment, recommendation

**Initial career suggestion**:
One of up to three catalog careers in the participant's selected career interests, proposed as a direction to explore from the grouped DESMAP scores. It has a short explanation but no compatibility percentage or VR evidence.
_Avoid_: Initial career match, final career suggestion, recommendation

**Grouped DESMAP score**:
One of the 28 normalized questionnaire scores used as input to the initial assessment.
_Avoid_: Fine DESMAP score, stage score

**Fine DESMAP score**:
One of the 35 lower-level questionnaire scores retained for the future final assessment. It is not sent to the initial-assessment API.
_Avoid_: Grouped DESMAP score, initial-assessment dimension

**Dimension evaluation level**:
One of five qualitative interpretations assigned to a grouped DESMAP dimension in the final assessment: not compatible, low compatibility, neutral, fairly compatible, or well compatible. For Desire dimensions, the level describes how strongly the participant values the factor rather than whether the result is good or bad.
_Avoid_: Fine DESMAP score, career match

**Final career suggestion**:
One of up to three careers proposed from the completed final assessment. It contains a compatibility percentage and an explanation connecting the participant's DESMAP results and observed evidence to the career.
_Avoid_: Career interest, career candidate, initial career match

**Participant**:
A person who provides a name and email address and completes one DESMAP initial assessment. Each normalized email address identifies at most one participant assessment.
_Avoid_: User, account, respondent

**Participant details**:
The participant's required name and normalized email address, saved with the questionnaire draft and completed assessment.
_Avoid_: Profile, account details, contact record
