DROP DATABASE IF EXISTS archivium;
CREATE DATABASE archivium;
USE archivium;

CREATE TABLE user (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(64) UNIQUE NOT NULL,
  password VARCHAR(64) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE session (
  id INT NOT NULL AUTO_INCREMENT,
  hash VARCHAR(64) NOT NULL,
  user_id INT,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user (id),
  PRIMARY KEY (id)
);

CREATE TABLE universe (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64) NOT NULL,
  shortname VARCHAR(64) UNIQUE NOT NULL,
  author_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  public BOOLEAN NOT NULL,
  obj_data TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES user (id),
  PRIMARY KEY (id)
);

CREATE TABLE item (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64) NOT NULL,
  shortname VARCHAR(64) NOT NULL,
  item_type ENUM('article', 'character', 'location', 'event', 'archive', 'document', 'timeline', 'item') NOT NULL,
  author_id INT NOT NULL,
  universe_id INT NOT NULL,
  UNIQUE(shortname, universe_id),
  parent_id INT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  obj_data TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES user (id),
  FOREIGN KEY (universe_id) REFERENCES universe (id),
  FOREIGN KEY (parent_id) REFERENCES item (id),
  PRIMARY KEY (id)
);

CREATE TABLE authoruniverse (
  id INT NOT NULL AUTO_INCREMENT,
  universe_id INT NOT NULL,
  user_id INT NOT NULL,
  permission_level TINYINT NOT NULL,
  FOREIGN KEY (universe_id) REFERENCES universe (id),
  FOREIGN KEY (user_id) REFERENCES user (id),
  PRIMARY KEY (id)
);