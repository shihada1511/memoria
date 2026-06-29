'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CalendarNote extends Model {
    static associate(models) {
      CalendarNote.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  CalendarNote.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    text: { type: DataTypes.STRING, allowNull: false }
  }, {
    sequelize,
    modelName: 'CalendarNote',
    tableName: 'CalendarNotes'
  });
  return CalendarNote;
};
