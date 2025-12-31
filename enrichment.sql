-- enrichment.sql
-- Flink SQL script with Event Time Processing and Watermarks

CREATE TABLE tour_blueprints (
    session_id STRING,
    stop_id STRING,
    stop_name STRING,
    context_hint STRING,
    PRIMARY KEY (session_id, stop_id) NOT ENFORCED
) WITH (
    'connector' = 'kafka',
    'topic' = 'tour-blueprints',
    'properties.bootstrap.servers' = 'YOUR_BOOTSTRAP_SERVER',
    'scan.startup.mode' = 'earliest-offset',
    'value.format' = 'json',
    'key.format' = 'json'
);

CREATE TABLE raw_media_stream (
    sessionId STRING,
    stopId STRING,
    source STRING, -- 'guide' or 'guest'
    type STRING,
    data STRING,
    event_timestamp TIMESTAMP(3), -- Event Time Column
    WATERMARK FOR event_timestamp AS event_timestamp - INTERVAL '10' MINUTE
) WITH (
    'connector' = 'kafka',
    'topic' = 'tour-photos-raw',
    'properties.bootstrap.servers' = 'YOUR_BOOTSTRAP_SERVER',
    'scan.startup.mode' = 'latest-offset',
    'value.format' = 'json'
);

CREATE TABLE enriched_media_stream (
    media_url STRING,
    event_time TIMESTAMP(3),
    stop_name STRING,
    context_hint STRING,
    session_id STRING,
    source STRING
) WITH (
    'connector' = 'kafka',
    'topic' = 'enriched-media-stream',
    'properties.bootstrap.servers' = 'YOUR_BOOTSTRAP_SERVER',
    'value.format' = 'json'
);

INSERT INTO enriched_media_stream
SELECT 
  stream.data as media_url,
  stream.event_timestamp as event_time,
  blueprint.stop_name, 
  blueprint.context_hint,
  stream.sessionId,
  stream.source
FROM raw_media_stream AS stream
-- Temporal Join on Event Time
JOIN tour_blueprints FOR SYSTEM_TIME AS OF stream.event_timestamp AS blueprint 
ON stream.sessionId = blueprint.session_id AND stream.stopId = blueprint.stop_id;