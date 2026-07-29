const mongoose = require("mongoose");
const {
  isDateOnlyString,
  normalizeDateOnlyString,
  getCurrentUTCDateString,
  getYearFromDateOnlyString,
  getYearEndDateString
} = require("../utils/dateUtils");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    startDate: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isDateOnlyString,
        message: "startDate must be in YYYY-MM-DD format"
      }
    },
    endDate: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isDateOnlyString,
        message: "endDate must be in YYYY-MM-DD format"
      }
    },
    eventYear: { type: Number, required: true },
    coverImageUrl: { type: String, trim: true },
    gallery: [{ type: String, trim: true }],
    registrationLink: { type: String, trim: true },
    flyerUrl: { type: String, trim: true },
    flyerOptions: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
  },
  { timestamps: true }
);

eventSchema.pre("validate", function setDerivedDates(next) {
  if (!this.startDate) {
    return next();
  }

  const normalizedStartDate = normalizeDateOnlyString(this.startDate);
  if (!normalizedStartDate) {
    this.invalidate("startDate", "startDate must be a valid date in YYYY-MM-DD format");
    return next();
  }

  const year = getYearFromDateOnlyString(normalizedStartDate);
  const endDate = getYearEndDateString(year);

  this.startDate = normalizedStartDate;
  this.eventYear = year;
  this.endDate = endDate;

  return next();
});

eventSchema.virtual("isArchived").get(function isArchived() {
  return this.startDate < getCurrentUTCDateString();
});

eventSchema.set("toJSON", {
  virtuals: true
});

eventSchema.set("toObject", {
  virtuals: true
});

module.exports = mongoose.model("Event", eventSchema);
