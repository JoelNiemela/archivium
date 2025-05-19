UPDATE schema_version SET version = 5, comment = 'Use on delete cascade', time = NOW();

ALTER TABLE item
DROP FOREIGN KEY item_ibfk_2;
ALTER TABLE item
ADD CONSTRAINT item_ibfk_2
FOREIGN KEY (universe_id) REFERENCES universe (id)
ON DELETE CASCADE;

ALTER TABLE followeruniverse
DROP FOREIGN KEY followeruniverse_ibfk_1;
ALTER TABLE followeruniverse
ADD CONSTRAINT followeruniverse_ibfk_1
FOREIGN KEY (universe_id) REFERENCES universe (id)
ON DELETE CASCADE;

ALTER TABLE authoruniverse
DROP FOREIGN KEY authoruniverse_ibfk_1;
ALTER TABLE authoruniverse
ADD CONSTRAINT authoruniverse_ibfk_1
FOREIGN KEY (universe_id) REFERENCES universe (id)
ON DELETE CASCADE;

ALTER TABLE universenotification
DROP FOREIGN KEY universenotification_ibfk_1;
ALTER TABLE universenotification
ADD CONSTRAINT universenotification_ibfk_1
FOREIGN KEY (universe_id) REFERENCES universe (id)
ON DELETE CASCADE;

ALTER TABLE universeaccessrequest
DROP FOREIGN KEY universeaccessrequest_ibfk_1;
ALTER TABLE universeaccessrequest
ADD CONSTRAINT universeaccessrequest_ibfk_1
FOREIGN KEY (universe_id) REFERENCES universe (id)
ON DELETE CASCADE;

ALTER TABLE discussion
DROP FOREIGN KEY discussion_ibfk_1;
ALTER TABLE discussion
ADD CONSTRAINT discussion_ibfk_1
FOREIGN KEY (universe_id) REFERENCES universe (id)
ON DELETE CASCADE;

ALTER TABLE itemevent
DROP FOREIGN KEY itemevent_ibfk_1;
ALTER TABLE itemevent
ADD CONSTRAINT itemevent_ibfk_1
FOREIGN KEY (item_id) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE timelineitem
DROP FOREIGN KEY timelineitem_ibfk_1;
ALTER TABLE timelineitem
ADD CONSTRAINT timelineitem_ibfk_1
FOREIGN KEY (timeline_id) REFERENCES item (id)
ON DELETE CASCADE;
ALTER TABLE timelineitem
DROP FOREIGN KEY timelineitem_ibfk_2;
ALTER TABLE timelineitem
ADD CONSTRAINT timelineitem_ibfk_2
FOREIGN KEY (event_id) REFERENCES itemevent (id)
ON DELETE CASCADE;

ALTER TABLE itemimage
DROP FOREIGN KEY itemimage_ibfk_1;
ALTER TABLE itemimage
ADD CONSTRAINT itemimage_ibfk_1
FOREIGN KEY (item_id) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE itemnote
DROP FOREIGN KEY itemnote_ibfk_1;
ALTER TABLE itemnote
ADD CONSTRAINT itemnote_ibfk_1
FOREIGN KEY (item_id) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE itemnotification
DROP FOREIGN KEY itemnotification_ibfk_1;
ALTER TABLE itemnotification
ADD CONSTRAINT itemnotification_ibfk_1
FOREIGN KEY (item_id) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE lineage
DROP FOREIGN KEY lineage_ibfk_1;
ALTER TABLE lineage
ADD CONSTRAINT lineage_ibfk_1
FOREIGN KEY (parent_id) REFERENCES item (id)
ON DELETE CASCADE;
ALTER TABLE lineage
DROP FOREIGN KEY lineage_ibfk_2;
ALTER TABLE lineage
ADD CONSTRAINT lineage_ibfk_2
FOREIGN KEY (child_id) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE tag
DROP FOREIGN KEY tag_ibfk_1;
ALTER TABLE tag
ADD CONSTRAINT tag_ibfk_1
FOREIGN KEY (item_id) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE snooze
DROP FOREIGN KEY snooze_ibfk_2;
ALTER TABLE snooze
ADD CONSTRAINT snooze_ibfk_2
FOREIGN KEY (item_id) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE itemcomment
DROP FOREIGN KEY itemcomment_ibfk_1;
ALTER TABLE itemcomment
ADD CONSTRAINT itemcomment_ibfk_1
FOREIGN KEY (item_id) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE itemlink
DROP FOREIGN KEY itemlink_ibfk_1;
ALTER TABLE itemlink
ADD CONSTRAINT itemlink_ibfk_1
FOREIGN KEY (from_item) REFERENCES item (id)
ON DELETE CASCADE;

ALTER TABLE eventorder
DROP FOREIGN KEY eventorder_ibfk_1;
ALTER TABLE eventorder
ADD CONSTRAINT eventorder_ibfk_1
FOREIGN KEY (former) REFERENCES itemevent (id)
ON DELETE CASCADE;
ALTER TABLE eventorder
DROP FOREIGN KEY eventorder_ibfk_2;
ALTER TABLE eventorder
ADD CONSTRAINT eventorder_ibfk_2
FOREIGN KEY (latter) REFERENCES itemevent (id)
ON DELETE CASCADE;
