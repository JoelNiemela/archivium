DROP DATABASE IF EXISTS archivium;
CREATE DATABASE archivium;
USE archivium;

CREATE TABLE user (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) UNIQUE,
  email VARCHAR(64) UNIQUE,
  password VARCHAR(64),
  salt VARCHAR(64),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE session (
  id INT NOT NULL AUTO_INCREMENT,
  hash VARCHAR(64),
  user_id INT,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user (id),
  PRIMARY KEY (id)
);

CREATE TABLE universe (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64),
  author_id INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  public BOOLEAN,
  obj_data TEXT,
  FOREIGN KEY (author_id) REFERENCES user (id),
  PRIMARY KEY (id)
);

CREATE TABLE item (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64),
  item_type ENUM('article', 'character', 'location', 'event', 'archive', 'document', 'timeline', 'item') NOT NULL,
  author_id INT NOT NULL,
  universe_id INT NOT NULL,
  parent_id INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  obj_data TEXT,
  FOREIGN KEY (author_id) REFERENCES user (id),
  FOREIGN KEY (universe_id) REFERENCES universe (id),
  FOREIGN KEY (parent_id) REFERENCES item (id),
  PRIMARY KEY (id)
);

CREATE TABLE authoruniverse (
  id INT NOT NULL AUTO_INCREMENT,
  universe_id INT,
  user_id INT,
  permission_level TINYINT,
  FOREIGN KEY (universe_id) REFERENCES universe (id),
  FOREIGN KEY (user_id) REFERENCES user (id),
  PRIMARY KEY (id)
);