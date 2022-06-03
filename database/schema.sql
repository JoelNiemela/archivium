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
  password VARCHAR(64),
  salt VARCHAR(64),
  PRIMARY KEY (id)
);

CREATE TABLE universes (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(32),
  authorId INT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  objData TEXT,
  FOREIGN KEY (authorId) REFERENCES users (id),
  PRIMARY KEY (id)
);

CREATE TABLE items (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(32),
  authorId INT,
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
  itemId INT,
  userId INT,
  permissionLevel INT,
  FOREIGN KEY (itemId) REFERENCES items (id),
  FOREIGN KEY (userId) REFERENCES users (id),
  PRIMARY KEY (id)
);