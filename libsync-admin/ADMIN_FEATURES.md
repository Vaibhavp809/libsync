# LibSync Admin Panel - E-Resources & Placement News Management

## Overview

The LibSync admin panel has been enhanced with two new management interfaces:

1. **E-Resources Management** - Manage digital resources, e-books, journals, and educational materials
2. **Placement News Management** - Manage placement announcements, job postings, and career-related news

## E-Resources Management

### Features
- **Resource Creation**: Add new digital resources with comprehensive metadata
- **Content Management**: Edit titles, descriptions, categories, and access information
- **Access Control**: Set resource access types (free, subscription, institutional, restricted)
- **Targeting**: Specify target departments, courses, and subjects
- **Statistics**: View resource usage statistics and engagement metrics
- **Search & Filter**: Pagination and search functionality for easy resource discovery

### Resource Types Supported
- E-books
- Journals
- Databases
- Videos
- Courses
- Research Papers
- Theses
- Articles
- Websites
- Other educational materials

### Key Fields
- Title, Description, Category, Subject
- Author, Publisher, Publication Date
- Resource URL, Language, Format
- Access credentials for restricted resources
- Keywords and targeting information
- Featured status and expiry dates

## Placement News Management

### Features
- **News Creation**: Create various types of placement-related announcements
- **Content Management**: Rich content editing with titles, summaries, and full articles
- **Status Management**: Draft, published, and archived status workflow
- **Priority Levels**: Set urgency levels (low, medium, high, urgent)
- **Company Information**: Detailed company profiles for job postings and visits
- **Event Management**: Manage dates, venues, and registration details
- **Statistics**: Track views and engagement metrics

### News Types Supported
- Job Postings
- Campus Drives
- Company Visits
- Placement Statistics
- Success Stories
- General Announcements
- Training Programs
- Workshops
- Seminars
- Interview Tips

### Key Features
- **Dynamic Forms**: Forms adapt based on selected news type
- **Company Details**: Industry, location, website information for relevant news types
- **Job Details**: Position, salary, experience requirements for job postings
- **Event Details**: Dates, venues, registration deadlines for events
- **Targeting**: Specify departments, courses, and semesters
- **Urgency Indicators**: Visual indicators for urgent news items

## Navigation

Access the new features through the admin panel sidebar:
- **💾 E-Resources** - `/eresources`
- **📰 Placement News** - `/placement-news`

Both pages are also accessible via quick actions on the main dashboard.

## Technical Implementation

### Frontend
- Built with React and Material-UI components
- Responsive design with comprehensive form validation
- Real-time statistics and data visualization
- Pagination and search capabilities
- Error handling and user feedback

### Backend Integration
- RESTful API integration with proper authentication
- Comprehensive CRUD operations
- File upload support for attachments
- Search and filtering capabilities
- Statistics and analytics endpoints

### API Endpoints Used
- `GET/POST/PUT/DELETE /api/eresources/admin/*` - E-Resources management
- `GET/POST/PUT/DELETE /api/placement-news/admin/*` - Placement News management

## Usage Guidelines

### E-Resources
1. **Adding Resources**: Click "Add E-Resource" and fill in the comprehensive form
2. **Editing**: Use the edit icon in the resources table
3. **Access Management**: Configure appropriate access types and credentials
4. **Targeting**: Use comma-separated values for departments and courses
5. **Featured Content**: Toggle featured status for prominent display

### Placement News
1. **Creating News**: Click "Add News" and select appropriate news type
2. **Content Management**: Write compelling titles and detailed content
3. **Publishing**: Use draft status for preparation, published for live content
4. **Company Info**: Fill in company details for job postings and visits
5. **Event Management**: Set dates, venues, and registration details for events

## Security & Permissions

- All management functions require admin authentication
- Token-based authentication with automatic session management
- Role-based access control through protected routes
- Secure API communication with proper error handling

## Future Enhancements

- File upload for resource attachments
- Rich text editor for news content
- Email notifications for urgent announcements
- Advanced analytics and reporting
- Bulk operations for resource management
- Integration with external job boards