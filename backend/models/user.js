'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Deck, { foreignKey: 'userId', as: 'decks', onDelete: 'CASCADE' });
      User.hasMany(models.CalendarNote, { foreignKey: 'userId', as: 'calendarNotes', onDelete: 'CASCADE' });
      User.hasMany(models.DeckRequest, { foreignKey: 'requesterId', as: 'outgoingRequests', onDelete: 'CASCADE' });
      User.hasMany(models.DeckAccess, { foreignKey: 'userId', as: 'deckAccess', onDelete: 'CASCADE' });
      User.hasMany(models.DeckMessage, { foreignKey: 'userId', as: 'messages', onDelete: 'CASCADE' });
    }
  }
  User.init({
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('user', 'manager'),
      allowNull: false,
      defaultValue: 'user'
    },
    theme: {
      type: DataTypes.ENUM('light', 'dark', 'system'),
      allowNull: false,
      defaultValue: 'light'
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users'
  });
  return User;
};
