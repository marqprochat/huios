import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List all lessons
export const getLessons = async (req: Request, res: Response) => {
  try {
    const { disciplineId, startDate, endDate } = req.query;
    
    const where: any = {};
    if (disciplineId) {
      where.disciplines = {
        some: { id: disciplineId as string }
      };
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        disciplines: {
          select: {
            id: true,
            name: true,
            courseClass: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            attendances: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

// Get lesson by ID
export const getLessonById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        disciplines: {
          select: {
            id: true,
            name: true,
            courseClass: {
              select: {
                name: true,
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: {
                    student: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
};

// Create new lesson
export const createLesson = async (req: Request, res: Response) => {
  try {
    const {
      disciplineId, // singular for backward compatibility OR
      disciplineIds, // plural for new UI
      date,
      startTime,
      endTime,
      locationName,
      latitude,
      longitude,
      radiusMeters = 100,
      description
    } = req.body;

    const ids: string[] = disciplineIds || (disciplineId ? [disciplineId] : []);

    // Validation
    if (ids.length === 0 || !date) {
      return res.status(400).json({ 
        error: 'At least one discipline and date are required' 
      });
    }

    const lesson = await prisma.lesson.create({
      data: {
        disciplines: {
          connect: ids.map(id => ({ id }))
        },
        date: new Date(date),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        locationName,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radiusMeters: parseInt(radiusMeters),
        description
      },
      include: {
        disciplines: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create attendance records for all enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: {
        class: {
          disciplines: {
            some: { id: { in: ids } }
          }
        },
        status: 'ACTIVE'
      },
      select: { studentId: true }
    });

    if (enrollments.length > 0) {
      await prisma.attendance.createMany({
        data: enrollments.map(enrollment => ({
          lessonId: lesson.id,
          studentId: enrollment.studentId,
          status: 'PENDING'
        })),
        skipDuplicates: true
      });
    }

    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
};

// Update lesson
export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      date,
      startTime,
      endTime,
      locationName,
      latitude,
      longitude,
      radiusMeters,
      description
    } = req.body;

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        startTime: startTime !== undefined ? (startTime ? new Date(startTime) : null) : undefined,
        endTime: endTime !== undefined ? (endTime ? new Date(endTime) : null) : undefined,
        locationName,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        radiusMeters: radiusMeters !== undefined ? parseInt(radiusMeters) : undefined,
        description
      },
      include: {
        disciplines: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(lesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
};

// Delete lesson
export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.lesson.delete({
      where: { id }
    });

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
};

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Check-in for attendance (mobile endpoint)
export const checkIn = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { studentId, latitude, longitude } = req.body;

    if (!studentId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'Student ID, latitude, and longitude are required' 
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        attendances: {
          where: { studentId }
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    let effectiveLat = lesson.latitude;
    let effectiveLong = lesson.longitude;
    let effectiveRadius = lesson.radiusMeters;

    if (!effectiveLat || !effectiveLong) {
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.latitude && settings?.longitude) {
        effectiveLat = settings.latitude;
        effectiveLong = settings.longitude;
        effectiveRadius = settings.radiusMeters;
      } else {
        return res.status(400).json({ error: 'Aula e instituição não possuem localização definida' });
      }
    }

    // Calculate distance
    const distance = calculateDistance(
      effectiveLat,
      effectiveLong,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    // Check if within radius
    const isWithinRadius = distance <= effectiveRadius;

    // Update or create attendance
    const attendance = await prisma.attendance.upsert({
      where: {
        lessonId_studentId: {
          lessonId,
          studentId
        }
      },
      update: {
        status: isWithinRadius ? 'PRESENT' : 'ABSENT',
        checkInAt: new Date(),
        checkInLat: parseFloat(latitude),
        checkInLong: parseFloat(longitude),
        distance: Math.round(distance)
      },
      create: {
        lessonId,
        studentId,
        status: isWithinRadius ? 'PRESENT' : 'ABSENT',
        checkInAt: new Date(),
        checkInLat: parseFloat(latitude),
        checkInLong: parseFloat(longitude),
        distance: Math.round(distance)
      }
    });

    res.json({
      attendance,
      distance: Math.round(distance),
      isWithinRadius,
      maxDistance: effectiveRadius
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
};
// Check-out for attendance (mobile endpoint)
export const checkOut = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { studentId, latitude, longitude } = req.body;

    if (!studentId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'Student ID, latitude, and longitude are required' 
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    let effectiveLat = lesson.latitude;
    let effectiveLong = lesson.longitude;
    let effectiveRadius = lesson.radiusMeters;

    if (!effectiveLat || !effectiveLong) {
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.latitude && settings?.longitude) {
        effectiveLat = settings.latitude;
        effectiveLong = settings.longitude;
        effectiveRadius = settings.radiusMeters;
      } else {
        return res.status(400).json({ error: 'Aula e instituição não possuem localização definida' });
      }
    }

    // Calculate distance
    const distance = calculateDistance(
      effectiveLat,
      effectiveLong,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    // Check if within radius
    const isWithinRadius = distance <= effectiveRadius;

    // Update attendance with check-out info
    const attendance = await prisma.attendance.update({
      where: {
        lessonId_studentId: {
          lessonId,
          studentId
        }
      },
      data: {
        checkOutAt: new Date(),
        checkOutLat: parseFloat(latitude),
        checkOutLong: parseFloat(longitude),
        checkOutDistance: Math.round(distance)
      }
    });

    res.json({
      attendance,
      distance: Math.round(distance),
      isWithinRadius,
      maxDistance: effectiveRadius
    });
  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
};
