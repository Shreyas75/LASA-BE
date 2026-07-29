const Event = require("../models/Event");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  normalizeDateOnlyString,
  getCurrentUTCDateString,
  getYearFromDateOnlyString,
  getYearEndDateString
} = require("../utils/dateUtils");
const { generateFlyerImages } = require("../services/flyerService");
const { uploadPublicObject } = require("../services/s3Service");

const listCurrentYearEvents = asyncHandler(async (req, res) => {
  const today = getCurrentUTCDateString();

  const events = await Event.find({ startDate: { $gte: today } })
    .sort({ startDate: 1 });

  return res.json({ events });
});

const listArchivedEvents = asyncHandler(async (req, res) => {
  const today = getCurrentUTCDateString();

  const events = await Event.find({ startDate: { $lt: today } })
    .sort({ startDate: -1 });

  return res.json({ events });
});

const listActiveEvents = asyncHandler(async (req, res) => {
  const today = getCurrentUTCDateString();

  const events = await Event.find({ startDate: { $gte: today } })
    .sort({ startDate: 1 });

  return res.json({ events });
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.validated.params.id);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  return res.json({ event });
});

const createEvent = asyncHandler(async (req, res) => {
  const payload = req.validated.body;

  const event = await Event.create({
    ...payload,
    createdBy: req.admin.id
  });

  return res.status(201).json({ event });
});

const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const payload = req.validated.body;

  if (payload.startDate) {
    const startDate = normalizeDateOnlyString(payload.startDate);
    if (!startDate) {
      return res.status(400).json({
        message: "startDate must be a valid date in YYYY-MM-DD format"
      });
    }

    const year = getYearFromDateOnlyString(startDate);

    payload.startDate = startDate;
    payload.eventYear = year;
    payload.endDate = getYearEndDateString(year);
  }

  const event = await Event.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  return res.json({ event });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const event = await Event.findByIdAndDelete(id);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  return res.json({ message: "Event deleted" });
});

const generateFlyerOptions = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const images = await generateFlyerImages(event);
  if (!images.length) {
    return res.status(500).json({ message: "Failed to generate flyers" });
  }

  const uploads = await Promise.all(
    images.map((base64, index) => {
      const buffer = Buffer.from(base64, "base64");
      const key = `events/${event._id}/flyers/${Date.now()}-${index + 1}.png`;
      return uploadPublicObject({
        key,
        body: buffer,
        contentType: "image/png"
      });
    })
  );

  const flyerOptions = uploads.map((item) => item.publicUrl);

  event.flyerOptions = flyerOptions;
  await event.save();

  return res.json({ options: flyerOptions });
});

const selectFlyer = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { selectedUrl } = req.validated.body;

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const options = event.flyerOptions || [];
  if (options.length && !options.includes(selectedUrl)) {
    return res.status(400).json({ message: "Selected flyer is not valid" });
  }

  event.flyerUrl = selectedUrl;
  event.coverImageUrl = selectedUrl;
  await event.save();

  return res.json({ event });
});

module.exports = {
  listCurrentYearEvents,
  listArchivedEvents,
  listActiveEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  generateFlyerOptions,
  selectFlyer
};
