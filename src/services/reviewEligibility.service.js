const { prisma } = require('../utils/prisma');
const ApiError = require('../utils/ApiError');
const { RouteStatus } = require('@prisma/client');

const validateTripCompletedBeforeReview = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      route: {
        select: {
          id: true,
          status: true
        }
      }
    }
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (!booking.route || booking.route.status !== RouteStatus.COMPLETED) {
    throw new ApiError(400, 'Trip must be completed before review');
  }

  return booking;
};

module.exports = {
  validateTripCompletedBeforeReview
};
