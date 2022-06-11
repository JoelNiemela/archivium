DROP DATABASE IF EXISTS archivium;
CREATE DATABASE archivium;
USE archivium;

CREATE TABLE sessions (
  id INT NOT NULL AUTO_INCREMENT,
  hash VARCHAR(64),
  userId INT,
  PRIMARY KEY (id)
);

CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) UNIQUE,
  email VARCHAR(64) UNIQUE,
  password VARCHAR(64),
  salt VARCHAR(64),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  permissionLevel TINYINT,
  PRIMARY KEY (id)
);

CREATE TABLE universes (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64),
  authorId INT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  public BOOLEAN,
  objData TEXT,
  FOREIGN KEY (authorId) REFERENCES users (id),
  PRIMARY KEY (id)
);

CREATE TABLE items (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64),
  itemType ENUM('character', 'location', 'event', 'archive', 'document', 'timeline', 'item') NOT NULL,
  authorId INT NOT NULL,
  universeId INT NOT NULL,
  parentId INT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  objData TEXT,
  FOREIGN KEY (authorId) REFERENCES users (id),
  FOREIGN KEY (universeId) REFERENCES universes (id),
  FOREIGN KEY (parentId) REFERENCES items (id),
  PRIMARY KEY (id)
);

CREATE TABLE authoruniverses (
  id INT NOT NULL AUTO_INCREMENT,
  universeId INT,
  userId INT,
  permissionLevel TINYINT,
  FOREIGN KEY (universeId) REFERENCES universes (id),
  FOREIGN KEY (userId) REFERENCES users (id),
  PRIMARY KEY (id)
);